import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Message, Chat, Agent, ModelConfig, Memory, CanvasFile,
  AgentThought, OrchestratorPlan, AppSettings, CompressionResult
} from '@/types';

// ============================================
// Chat Store
// ============================================

interface ChatState {
  chats: Chat[];
  currentChatId: string | null;
  isLoading: boolean;
  streamingMessageId: string | null;
  
  // Actions
  createChat: (agentIds?: string[], model?: string) => string;
  deleteChat: (chatId: string) => void;
  archiveChat: (chatId: string) => void;
  setCurrentChat: (chatId: string) => void;
  addMessage: (chatId: string, message: Message) => void;
  updateMessage: (chatId: string, messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (chatId: string, messageId: string) => void;
  compressChat: (chatId: string, result: CompressionResult) => void;
  updateChatMetadata: (chatId: string, metadata: Partial<Chat['metadata']>) => void;
  updateChatTitle: (chatId: string, title: string) => void;
  clearChats: () => void;
  setLoading: (loading: boolean) => void;
  setStreamingMessage: (messageId: string | null) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      chats: [],
      currentChatId: null,
      isLoading: false,
      streamingMessageId: null,

      createChat: (agentIds = [], model = 'default') => {
        const id = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newChat: Chat = {
          id,
          title: 'New Conversation',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          model,
          agentIds,
          isArchived: false,
          tokenCount: 0,
          contextWindow: 0,
          metadata: {
            keyPoints: [],
            entities: [],
            relatedChatIds: [],
          },
        };
        set((state) => ({
          chats: [newChat, ...state.chats],
          currentChatId: id,
        }));
        return id;
      },

      deleteChat: (chatId) => {
        set((state) => ({
          chats: state.chats.filter((c) => c.id !== chatId),
          currentChatId: state.currentChatId === chatId ? null : state.currentChatId,
        }));
      },

      archiveChat: (chatId) => {
        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === chatId ? { ...c, isArchived: true } : c
          ),
        }));
      },

      setCurrentChat: (chatId) => {
        set({ currentChatId: chatId });
      },

      addMessage: (chatId, message) => {
        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  messages: [...c.messages, message],
                  updatedAt: Date.now(),
                  tokenCount: c.tokenCount + (message.tokens || 0),
                }
              : c
          ),
        }));
      },

      updateMessage: (chatId, messageId, updates) => {
        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === messageId ? { ...m, ...updates } : m
                  ),
                }
              : c
          ),
        }));
      },

      deleteMessage: (chatId, messageId) => {
        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  messages: c.messages.filter((m) => m.id !== messageId),
                }
              : c
          ),
        }));
      },

      compressChat: (chatId, result) => {
        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  messages: [
                    ...c.messages.filter((m) => result.preservedMessages.includes(m.id)),
                    {
                      id: `summary_${Date.now()}`,
                      role: 'system',
                      content: `Previous conversation summary: ${result.summary}`,
                      timestamp: Date.now(),
                      isCompressed: true,
                      compressedSummary: result.summary,
                    },
                  ],
                  tokenCount: result.compressedTokens,
                  metadata: {
                    ...c.metadata,
                    summary: result.summary,
                    keyPoints: [...c.metadata.keyPoints, ...result.keyPoints],
                  },
                }
              : c
          ),
        }));
      },

      updateChatMetadata: (chatId, metadata) => {
        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === chatId
              ? { ...c, metadata: { ...c.metadata, ...metadata } }
              : c
          ),
        }));
      },

      updateChatTitle: (chatId, title) => {
        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === chatId ? { ...c, title } : c
          ),
        }));
      },

      clearChats: () => {
        set({ chats: [], currentChatId: null });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      setStreamingMessage: (messageId) => {
        set({ streamingMessageId: messageId });
      },
    }),
    {
      name: 'chat-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ chats: state.chats, currentChatId: state.currentChatId }),
    }
  )
);

// ============================================
// Agent Store
// ============================================

interface AgentState {
  agents: Agent[];
  activeAgentIds: string[];
  thoughts: AgentThought[];
  orchestratorPlans: OrchestratorPlan[];
  
  // Actions
  addAgent: (agent: Agent) => void;
  updateAgent: (agentId: string, updates: Partial<Agent>) => void;
  deleteAgent: (agentId: string) => void;
  toggleAgent: (agentId: string) => void;
  setActiveAgents: (agentIds: string[]) => void;
  addThought: (thought: AgentThought) => void;
  clearThoughts: () => void;
  addPlan: (plan: OrchestratorPlan) => void;
  updatePlan: (planId: string, updates: Partial<OrchestratorPlan>) => void;
}

const defaultAgents: Agent[] = [
  {
    id: 'orchestrator',
    name: 'Orchestrator',
    description: 'Coordinates multiple agents and breaks down complex tasks',
    avatar: '🎯',
    color: '#8b5cf6',
    model: 'openrouter:meta-llama/llama-3.3-70b-instruct:free',
    systemPrompt: `You are the Orchestrator agent. Your role is to:
1. Analyze user requests and break them down into subtasks
2. Assign appropriate specialized agents to each subtask
3. Coordinate agent collaboration and information flow
4. Synthesize final responses from multiple agent outputs
5. Show your reasoning process clearly`,
    capabilities: ['reasoning', 'planning', 'analysis'],
    isActive: true,
    temperature: 0.3,
    maxTokens: 4096,
  },
  {
    id: 'coder',
    name: 'Code Expert',
    description: 'Specialized in writing, reviewing, and debugging code',
    avatar: '💻',
    color: '#3b82f6',
    model: 'openrouter:google/gemma-3-27b-it:free',
    systemPrompt: `You are the Code Expert agent. Your role is to:
1. Write clean, efficient, and well-documented code
2. Review code for bugs, security issues, and best practices
3. Explain complex code concepts clearly
4. Provide working examples and solutions
5. Consider edge cases and error handling`,
    capabilities: ['coding', 'analysis', 'review'],
    isActive: true,
    temperature: 0.2,
    maxTokens: 4096,
  },
  {
    id: 'analyst',
    name: 'Data Analyst',
    description: 'Analyzes data, identifies patterns, and provides insights',
    avatar: '📊',
    color: '#10b981',
    model: 'openrouter:meta-llama/llama-3.3-70b-instruct:free',
    systemPrompt: `You are the Data Analyst agent. Your role is to:
1. Analyze data and identify trends and patterns
2. Provide data-driven insights and recommendations
3. Create clear visualizations and summaries
4. Validate assumptions with evidence
5. Think critically about data quality and limitations`,
    capabilities: ['analysis', 'research', 'math'],
    isActive: true,
    temperature: 0.3,
    maxTokens: 4096,
  },
  {
    id: 'creative',
    name: 'Creative Writer',
    description: 'Generates creative content, stories, and innovative ideas',
    avatar: '✨',
    color: '#f59e0b',
    model: 'openrouter:google/gemma-3-27b-it:free',
    systemPrompt: `You are the Creative Writer agent. Your role is to:
1. Generate creative and engaging content
2. Brainstorm innovative ideas and solutions
3. Adapt tone and style to the audience
4. Use vivid language and storytelling techniques
5. Think outside the box`,
    capabilities: ['creative', 'reasoning'],
    isActive: false,
    temperature: 0.8,
    maxTokens: 4096,
  },
  {
    id: 'researcher',
    name: 'Researcher',
    description: 'Gathers information and provides comprehensive research',
    avatar: '🔍',
    color: '#ec4899',
    model: 'openrouter:meta-llama/llama-3.3-70b-instruct:free',
    systemPrompt: `You are the Researcher agent. Your role is to:
1. Gather comprehensive information on topics
2. Synthesize information from multiple sources
3. Provide well-structured and cited information
4. Identify gaps in knowledge and suggest further research
5. Present findings objectively`,
    capabilities: ['research', 'analysis'],
    isActive: false,
    temperature: 0.4,
    maxTokens: 4096,
  },
];

export const useAgentStore = create<AgentState>()(
  persist(
    (set) => ({
      agents: defaultAgents,
      activeAgentIds: ['orchestrator', 'coder', 'analyst'],
      thoughts: [],
      orchestratorPlans: [],

      addAgent: (agent) => {
        set((state) => ({ agents: [...state.agents, agent] }));
      },

      updateAgent: (agentId, updates) => {
        set((state) => ({
          agents: state.agents.map((a) =>
            a.id === agentId ? { ...a, ...updates } : a
          ),
        }));
      },

      deleteAgent: (agentId) => {
        set((state) => ({
          agents: state.agents.filter((a) => a.id !== agentId),
          activeAgentIds: state.activeAgentIds.filter((id) => id !== agentId),
        }));
      },

      toggleAgent: (agentId) => {
        set((state) => ({
          activeAgentIds: state.activeAgentIds.includes(agentId)
            ? state.activeAgentIds.filter((id) => id !== agentId)
            : [...state.activeAgentIds, agentId],
        }));
      },

      setActiveAgents: (agentIds) => {
        set({ activeAgentIds: agentIds });
      },

      addThought: (thought) => {
        set((state) => ({
          thoughts: [...state.thoughts.slice(-50), thought],
        }));
      },

      clearThoughts: () => {
        set({ thoughts: [] });
      },

      addPlan: (plan) => {
        set((state) => ({
          orchestratorPlans: [...state.orchestratorPlans, plan],
        }));
      },

      updatePlan: (planId, updates) => {
        set((state) => ({
          orchestratorPlans: state.orchestratorPlans.map((p) =>
            p.id === planId ? { ...p, ...updates } : p
          ),
        }));
      },
    }),
    {
      name: 'agent-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ agents: state.agents, activeAgentIds: state.activeAgentIds }),
    }
  )
);

// ============================================
// Model Store
// ============================================

interface ModelState {
  models: ModelConfig[];
  selectedModel: string;
  
  // Actions
  addModel: (model: ModelConfig) => void;
  updateModel: (modelId: string, updates: Partial<ModelConfig>) => void;
  deleteModel: (modelId: string) => void;
  setSelectedModel: (modelId: string) => void;
}

const defaultModels: ModelConfig[] = [
  {
    id: 'openrouter-llama-3.3-70b',
    name: 'Llama 3.3 70B (Free)',
    provider: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    maxTokens: 4096,
    temperature: 0.7,
    isFree: true,
    capabilities: ['chat', 'code', 'streaming', 'function-calling'],
    contextWindow: 128000,
  },
  {
    id: 'openrouter-gemma-3-27b',
    name: 'Gemma 3 27B (Free)',
    provider: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    maxTokens: 4096,
    temperature: 0.7,
    isFree: true,
    capabilities: ['chat', 'code', 'vision', 'streaming'],
    contextWindow: 128000,
  },
  {
    id: 'openrouter-deepseek-r1',
    name: 'DeepSeek R1 (Free)',
    provider: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    maxTokens: 4096,
    temperature: 0.7,
    isFree: true,
    capabilities: ['chat', 'code', 'streaming'],
    contextWindow: 64000,
  },
  {
    id: 'openrouter-qwen-2.5-72b',
    name: 'Qwen 2.5 72B (Free)',
    provider: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    maxTokens: 4096,
    temperature: 0.7,
    isFree: true,
    capabilities: ['chat', 'code', 'streaming'],
    contextWindow: 128000,
  },
  {
    id: 'groq-llama-3.3-70b',
    name: 'Groq Llama 3.3 70B',
    provider: 'groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    maxTokens: 4096,
    temperature: 0.7,
    isFree: true,
    capabilities: ['chat', 'code', 'streaming'],
    contextWindow: 128000,
  },
  {
    id: 'groq-mixtral-8x7b',
    name: 'Groq Mixtral 8x7B',
    provider: 'groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    maxTokens: 4096,
    temperature: 0.7,
    isFree: true,
    capabilities: ['chat', 'code', 'streaming'],
    contextWindow: 32768,
  },
];

export const useModelStore = create<ModelState>()(
  persist(
    (set) => ({
      models: defaultModels,
      selectedModel: 'openrouter-llama-3.3-70b',

      addModel: (model) => {
        set((state) => ({ models: [...state.models, model] }));
      },

      updateModel: (modelId, updates) => {
        set((state) => ({
          models: state.models.map((m) =>
            m.id === modelId ? { ...m, ...updates } : m
          ),
        }));
      },

      deleteModel: (modelId) => {
        set((state) => ({
          models: state.models.filter((m) => m.id !== modelId),
        }));
      },

      setSelectedModel: (modelId) => {
        set({ selectedModel: modelId });
      },
    }),
    {
      name: 'model-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ models: state.models, selectedModel: state.selectedModel }),
    }
  )
);

// ============================================
// Memory Store
// ============================================

interface MemoryState {
  memories: Memory[];
  
  // Actions
  addMemory: (memory: Omit<Memory, 'id' | 'createdAt'>) => void;
  updateMemory: (memoryId: string, updates: Partial<Memory>) => void;
  deleteMemory: (memoryId: string) => void;
  getMemoriesForChat: (chatId: string) => Memory[];
  searchMemories: (query: string) => Memory[];
}

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      memories: [],

      addMemory: (memory) => {
        const newMemory: Memory = {
          ...memory,
          id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: Date.now(),
        };
        set((state) => ({ memories: [...state.memories, newMemory] }));
      },

      updateMemory: (memoryId, updates) => {
        set((state) => ({
          memories: state.memories.map((m) =>
            m.id === memoryId ? { ...m, ...updates } : m
          ),
        }));
      },

      deleteMemory: (memoryId) => {
        set((state) => ({
          memories: state.memories.filter((m) => m.id !== memoryId),
        }));
      },

      getMemoriesForChat: (chatId) => {
        return get().memories.filter((m) => m.chatIds.includes(chatId));
      },

      searchMemories: (query) => {
        const lowerQuery = query.toLowerCase();
        return get().memories.filter((m) =>
          m.content.toLowerCase().includes(lowerQuery)
        );
      },
    }),
    {
      name: 'memory-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ memories: state.memories }),
    }
  )
);

// ============================================
// Canvas Store
// ============================================

interface CanvasState {
  files: CanvasFile[];
  activeFileId: string | null;
  isPreviewVisible: boolean;
  previewMode: 'code' | 'preview' | 'split';
  
  // Actions
  createFile: (name: string, language: string, content?: string) => string;
  updateFile: (fileId: string, updates: Partial<CanvasFile>) => void;
  deleteFile: (fileId: string) => void;
  setActiveFile: (fileId: string | null) => void;
  setPreviewVisible: (visible: boolean) => void;
  setPreviewMode: (mode: 'code' | 'preview' | 'split') => void;
  getActiveFile: () => CanvasFile | null;
}

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get) => ({
      files: [],
      activeFileId: null,
      isPreviewVisible: false,
      previewMode: 'split',

      createFile: (name, language, content = '') => {
        const id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newFile: CanvasFile = {
          id,
          name,
          language,
          content,
          isActive: true,
          lastModified: Date.now(),
        };
        set((state) => ({
          files: state.files.map((f) => ({ ...f, isActive: false })).concat(newFile),
          activeFileId: id,
          isPreviewVisible: true,
        }));
        return id;
      },

      updateFile: (fileId, updates) => {
        set((state) => ({
          files: state.files.map((f) =>
            f.id === fileId
              ? { ...f, ...updates, lastModified: Date.now() }
              : f
          ),
        }));
      },

      deleteFile: (fileId) => {
        set((state) => {
          const newFiles = state.files.filter((f) => f.id !== fileId);
          const newActiveId =
            state.activeFileId === fileId
              ? newFiles.length > 0
                ? newFiles[newFiles.length - 1].id
                : null
              : state.activeFileId;
          return {
            files: newFiles,
            activeFileId: newActiveId,
            isPreviewVisible: newFiles.length > 0 && state.isPreviewVisible,
          };
        });
      },

      setActiveFile: (fileId) => {
        set((state) => ({
          files: state.files.map((f) => ({
            ...f,
            isActive: f.id === fileId,
          })),
          activeFileId: fileId,
        }));
      },

      setPreviewVisible: (visible) => {
        set({ isPreviewVisible: visible });
      },

      setPreviewMode: (mode) => {
        set({ previewMode: mode });
      },

      getActiveFile: () => {
        const { files, activeFileId } = get();
        return files.find((f) => f.id === activeFileId) || null;
      },
    }),
    {
      name: 'canvas-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ files: state.files, activeFileId: state.activeFileId }),
    }
  )
);

// ============================================
// Settings Store
// ============================================

interface SettingsState extends AppSettings {
  // Actions
  updateSettings: (settings: Partial<AppSettings>) => void;
  setApiKey: (provider: string, key: string) => void;
  resetSettings: () => void;
}

const defaultSettings: AppSettings = {
  theme: 'dark',
  defaultModel: 'openrouter-llama-3.3-70b',
  activeAgents: ['orchestrator', 'coder', 'analyst'],
  autoCompress: true,
  compressionThreshold: 8000,
  maxContextWindow: 32000,
  showThoughts: true,
  enableVoice: false,
  language: 'en',
  apiKeys: {},
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      updateSettings: (settings) => {
        set((state) => ({ ...state, ...settings }));
      },

      setApiKey: (provider, key) => {
        set((state) => ({
          apiKeys: { ...state.apiKeys, [provider]: key },
        }));
      },

      resetSettings: () => {
        set(defaultSettings);
      },
    }),
    {
      name: 'settings-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
