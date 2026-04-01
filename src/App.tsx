import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Settings,
  PanelLeft,
  PanelRight,
  Code,
  Sparkles,
  Brain,
  MessageSquare,
  Zap,
  Menu,
  ChevronLeft,
  Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { toast, Toaster } from 'sonner';
import { Sidebar } from '@/components/Sidebar';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { AgentPanel } from '@/components/AgentPanel';
import { CodeCanvas } from '@/components/CodeCanvas';
import { SettingsPanel } from '@/components/SettingsPanel';
import { useMobile } from '@/hooks/useMobile';
import {
  useChatStore,
  useAgentStore,
  useModelStore,
  useSettingsStore,
  useMemoryStore,
} from '@/store';
import { aiService, agentOrchestrator, memoryService } from '@/services/ai';
import type { Message, AgentThought } from '@/types';

// ============================================
// Main App Component
// ============================================

function App() {
  // Store hooks
  const {
    chats,
    currentChatId,
    addMessage,
    updateMessage,
    createChat,
    setCurrentChat,
    compressChat,
    updateChatTitle,
    isLoading,
    setLoading,
    streamingMessageId,
    setStreamingMessage,
  } = useChatStore();

  const { agents, activeAgentIds, addThought } = useAgentStore();
  const { selectedModel } = useModelStore();
  const { autoCompress, compressionThreshold, showThoughts } = useSettingsStore();
  const { addMemory, getMemoriesForChat } = useMemoryStore();
  const { isMobile, isTablet } = useMobile();

  // Local state
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(!isMobile);
  const [showAgentPanel, setShowAgentPanel] = useState(!isMobile && !isTablet);
  const [showCanvas, setShowCanvas] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileAgentPanelOpen, setMobileAgentPanelOpen] = useState(false);

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get current chat
  const currentChat = chats.find((c) => c.id === currentChatId);

  // Update sidebar visibility on screen size change
  useEffect(() => {
    setShowSidebar(!isMobile);
    setShowAgentPanel(!isMobile && !isTablet);
  }, [isMobile, isTablet]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentChat?.messages, streamingMessageId]);

  // Check for compression need
  useEffect(() => {
    if (
      currentChat &&
      autoCompress &&
      currentChat.tokenCount > compressionThreshold &&
      !currentChat.isCompressed
    ) {
      handleCompressChat();
    }
  }, [currentChat?.tokenCount]);

  // Handle sending message
  const handleSendMessage = useCallback(
    async (content: string, attachments?: File[]) => {
      if (!currentChatId) {
        const newChatId = createChat();
        setCurrentChat(newChatId);
        // Wait for state update
        setTimeout(() => handleSendMessage(content, attachments), 0);
        return;
      }

      // Create user message
      const userMessage: Message = {
        id: `msg_${Date.now()}_user`,
        role: 'user',
        content,
        timestamp: Date.now(),
        attachments: attachments?.map((file, idx) => ({
          id: `att_${Date.now()}_${idx}`,
          type: file.type.startsWith('image/') ? 'image' : 'file',
          name: file.name,
          url: URL.createObjectURL(file),
          size: file.size,
          mimeType: file.type,
        })),
        tokens: aiService.estimateTokens(content),
      };

      addMessage(currentChatId, userMessage);

      // Generate title if first message
      if (currentChat && currentChat.messages.length === 0) {
        const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
        updateChatTitle(currentChatId, title);
      }

      // Start AI response
      await generateAIResponse(content);
    },
    [currentChatId, currentChat, createChat, setCurrentChat, addMessage, updateChatTitle]
  );

  // Generate AI response with multi-agent support
  const generateAIResponse = async (userMessage: string) => {
    if (!currentChatId) return;

    setLoading(true);

    try {
      // Create assistant message placeholder
      const assistantMessage: Message = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        model: selectedModel,
      };

      addMessage(currentChatId, assistantMessage);
      setStreamingMessage(assistantMessage.id);

      // Get relevant memories
      const memories = getMemoriesForChat(currentChatId);
      const memoryContext = memoryService.buildMemoryContext(memories);

      // Get active agents
      const activeAgents = agents.filter((a) => activeAgentIds.includes(a.id));

      let fullContent = '';

      if (activeAgents.length > 1) {
        // Multi-agent mode
        const generator = agentOrchestrator.executeCollaboration(
          userMessage,
          currentChat?.messages || [],
          (thought: AgentThought) => {
            addThought(thought);
            if (showThoughts) {
              const thoughtMessage: Message = {
                id: `thought_${Date.now()}`,
                role: 'thought',
                content: thought.thought,
                timestamp: Date.now(),
                agentId: thought.agentId,
              };
              addMessage(currentChatId, thoughtMessage);
            }
          }
        );

        for await (const chunk of generator) {
          if (chunk.type === 'content') {
            fullContent += chunk.data as string;
            updateMessage(currentChatId, assistantMessage.id, {
              content: fullContent,
            });
          } else if (chunk.type === 'agent_switch') {
            // Update which agent is responding
            const agentData = chunk.data as { agent: { id: string; model: string } };
            updateMessage(currentChatId, assistantMessage.id, {
              agentId: agentData.agent.id,
              model: agentData.agent.model,
            });
          }
        }
      } else {
        // Single agent mode
        const agent = activeAgents[0] || agents[0];
        const modelConfig =
          useModelStore.getState().models.find((m) => m.id === selectedModel) ||
          useModelStore.getState().models[0];

        const systemPrompt = memoryContext
          ? `${agent?.systemPrompt || ''}\n\n${memoryContext}`
          : agent?.systemPrompt;

        // Add agent thought
        if (showThoughts && agent) {
          const thought: AgentThought = {
            agentId: agent.id,
            agentName: agent.name,
            thought: `Analyzing request: ${userMessage.substring(0, 100)}...`,
            timestamp: Date.now(),
            type: 'reasoning',
          };
          addThought(thought);
        }

        for await (const chunk of aiService.streamChatCompletion(
          currentChat?.messages || [],
          modelConfig,
          systemPrompt,
          (thought) => {
            if (showThoughts && agent) {
              addThought({
                agentId: agent.id,
                agentName: agent.name,
                thought,
                timestamp: Date.now(),
                type: 'reasoning',
              });
            }
          }
        )) {
          fullContent += chunk;
          updateMessage(currentChatId, assistantMessage.id, {
            content: fullContent,
            agentId: agent?.id,
            model: selectedModel,
          });
        }
      }

      // Finalize message
      updateMessage(currentChatId, assistantMessage.id, {
        content: fullContent,
        tokens: aiService.estimateTokens(fullContent),
      });

      // Extract memories from conversation
      const newMemories = await memoryService.extractMemories(
        [...(currentChat?.messages || []), { ...assistantMessage, content: fullContent }],
        currentChatId
      );

      newMemories.forEach((memory) => {
        addMemory({
          ...memory,
          chatIds: [currentChatId],
        });
      });

      // Check for code blocks and offer to open in canvas
      const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
      const hasCode = codeBlockRegex.test(fullContent);
      if (hasCode) {
        toast.info('Code detected! Click "Open in Canvas" to preview.', {
          action: {
            label: 'Open Canvas',
            onClick: () => setShowCanvas(true),
          },
        });
      }
    } catch (error) {
      console.error('Error generating response:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate response');

      // Add error message
      addMessage(currentChatId, {
        id: `error_${Date.now()}`,
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
      });
    } finally {
      setLoading(false);
      setStreamingMessage(null);
    }
  };

  // Handle chat compression
  const handleCompressChat = async () => {
    if (!currentChatId || !currentChat) return;

    toast.info('Compressing conversation...');

    try {
      const modelConfig =
        useModelStore.getState().models.find((m) => m.id === selectedModel) ||
        useModelStore.getState().models[0];

      const result = await aiService.compressConversation(
        currentChat.messages,
        modelConfig
      );

      compressChat(currentChatId, result);
      toast.success(
        `Compressed from ${result.originalTokens} to ${result.compressedTokens} tokens`
      );
    } catch (error) {
      toast.error('Failed to compress chat');
    }
  };

  return (
    <div className="h-screen flex bg-slate-950 text-slate-100 overflow-hidden">
      <Toaster position={isMobile ? 'top-center' : 'top-right'} richColors />

      {/* Desktop Sidebar */}
      {!isMobile && showSidebar && (
        <div className="w-72 flex-shrink-0">
          <Sidebar onClose={() => setShowSidebar(false)} />
        </div>
      )}

      {/* Mobile Sidebar Sheet */}
      {isMobile && (
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="w-[280px] p-0 bg-slate-950 border-slate-800">
            <Sidebar onClose={() => setMobileSidebarOpen(false)} isMobile />
          </SheetContent>
        </Sheet>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-3 py-2 md:px-4 md:py-3 border-b border-slate-800 bg-slate-950/50 backdrop-blur">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile Menu Button */}
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileSidebarOpen(true)}
                className="text-slate-400 flex-shrink-0"
              >
                <Menu className="w-5 h-5" />
              </Button>
            )}

            {/* Desktop Sidebar Toggle */}
            {!isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSidebar(!showSidebar)}
                className="text-slate-400"
              >
                <PanelLeft className="w-5 h-5" />
              </Button>
            )}

            {currentChat ? (
              <div className="min-w-0">
                <h2 className="font-medium text-sm md:text-base truncate">{currentChat.title}</h2>
                <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                  <span>{currentChat.messages.length} msgs</span>
                  <span>·</span>
                  <span>{currentChat.tokenCount.toLocaleString()} tokens</span>
                  {currentChat.isCompressed && (
                    <>
                      <span>·</span>
                      <span className="text-amber-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Compressed
                      </span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-500">
                <Brain className="w-5 h-5" />
                <span className="hidden sm:inline">Select or start a new chat</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            {/* Mobile: Compact buttons */}
            {isMobile ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowCanvas(!showCanvas)}
                  className={`${showCanvas ? 'text-blue-400' : 'text-slate-400'} h-8 w-8`}
                >
                  <Code className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileAgentPanelOpen(true)}
                  className="text-slate-400 h-8 w-8"
                >
                  <Bot className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSettings(true)}
                  className="text-slate-400 h-8 w-8"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowCanvas(!showCanvas)}
                  className={showCanvas ? 'text-blue-400' : 'text-slate-400'}
                >
                  <Code className="w-5 h-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAgentPanel(!showAgentPanel)}
                  className={showAgentPanel ? 'text-purple-400' : 'text-slate-400'}
                >
                  <PanelRight className="w-5 h-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSettings(true)}
                  className="text-slate-400"
                >
                  <Settings className="w-5 h-5" />
                </Button>
              </>
            )}
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Messages */}
          <div className="flex-1 flex flex-col min-w-0">
            <ScrollArea className="flex-1" ref={scrollRef}>
              {currentChat ? (
                <div className="divide-y divide-slate-800/50">
                  {currentChat.messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4 py-8">
                      <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-4">
                        <Brain className="w-7 h-7 md:w-8 md:h-8 text-white" />
                      </div>
                      <h3 className="text-xl md:text-2xl font-bold mb-2">
                        Multi-Agent AI
                      </h3>
                      <p className="text-slate-400 max-w-md mb-6 text-sm md:text-base px-4">
                        Experience multiple AI agents working together for better results.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 max-w-md w-full px-4">
                        {[
                          'Write a Python script',
                          'Explain quantum computing',
                          'Create a React component',
                          'Help plan my project',
                        ].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => handleSendMessage(suggestion)}
                            className="p-2.5 md:p-3 text-left text-sm bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 hover:bg-slate-800 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 mt-6 md:mt-8 text-xs md:text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3 md:w-4 md:h-4 text-yellow-400" />
                          {activeAgentIds.length} agents
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 md:w-4 md:h-4 text-blue-400" />
                          Smart compression
                        </span>
                        <span className="flex items-center gap-1">
                          <Code className="w-3 h-3 md:w-4 md:h-4 text-green-400" />
                          Code canvas
                        </span>
                      </div>
                    </div>
                  ) : (
                    currentChat.messages.map((message) => (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        isStreaming={message.id === streamingMessageId}
                      />
                    ))
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <MessageSquare className="w-10 h-10 md:w-12 md:h-12 mb-4 opacity-50" />
                  <p className="text-sm md:text-base">Select or start a new conversation</p>
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <ChatInput
              onSend={handleSendMessage}
              isLoading={isLoading}
              disabled={!currentChatId}
            />
          </div>

          {/* Code Canvas - Responsive */}
          {showCanvas && (
            <div className={`${isMobile ? 'fixed inset-0 z-40' : 'w-[500px] lg:w-[600px]'} border-l border-slate-800 bg-slate-950`}>
              {isMobile && (
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
                  <span className="font-medium">Code Canvas</span>
                  <Button variant="ghost" size="icon" onClick={() => setShowCanvas(false)}>
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                </div>
              )}
              <CodeCanvas onClose={() => setShowCanvas(false)} isMobile={isMobile} />
            </div>
          )}
        </div>
      </div>

      {/* Desktop Agent Panel */}
      {!isMobile && showAgentPanel && (
        <div className="w-80 flex-shrink-0">
          <AgentPanel onClose={() => setShowAgentPanel(false)} />
        </div>
      )}

      {/* Mobile Agent Panel Sheet */}
      {isMobile && (
        <Sheet open={mobileAgentPanelOpen} onOpenChange={setMobileAgentPanelOpen}>
          <SheetContent side="right" className="w-[300px] p-0 bg-slate-950 border-slate-800">
            <AgentPanel onClose={() => setMobileAgentPanelOpen(false)} isMobile />
          </SheetContent>
        </Sheet>
      )}

      {/* Settings Panel */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} isMobile={isMobile} />}
    </div>
  );
}

export default App;
