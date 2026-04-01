import { useState } from 'react';
import { Bot, User, Brain, Sparkles, 
         Copy, Check, FileCode, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Message } from '@/types';
import { useAgentStore, useCanvasStore } from '@/store';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const { agents } = useAgentStore();
  const { createFile, setPreviewVisible } = useCanvasStore();

  const isUser = message.role === 'user';
  const isThought = message.role === 'thought';
  const agent = message.agentId ? agents.find((a) => a.id === message.agentId) : null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Extract code blocks from message
  const extractCodeBlocks = (content: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks = [];
    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2].trim(),
      });
    }
    return blocks;
  };

  const codeBlocks = extractCodeBlocks(message.content);

  const openInCanvas = (code: string, language: string) => {
    const filename = `code_${Date.now()}.${getFileExtension(language)}`;
    createFile(filename, language, code);
    setPreviewVisible(true);
  };

  const getFileExtension = (lang: string): string => {
    const extensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      html: 'html',
      css: 'css',
      json: 'json',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      go: 'go',
      rust: 'rs',
      ruby: 'rb',
      php: 'php',
      swift: 'swift',
      kotlin: 'kt',
      sql: 'sql',
      bash: 'sh',
      shell: 'sh',
      yaml: 'yaml',
      xml: 'xml',
    };
    return extensions[lang.toLowerCase()] || 'txt';
  };

  if (isThought) {
    return (
      <div className="flex gap-1.5 md:gap-2 py-1 px-3 md:px-4 opacity-60 hover:opacity-100 transition-opacity">
        <Brain className="w-3 h-3 md:w-4 md:h-4 text-purple-400 mt-0.5 flex-shrink-0" />
        <div className="text-[10px] md:text-xs text-purple-300 italic">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              p: ({ children }) => <span>{children}</span>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex gap-2 md:gap-4 p-2.5 md:p-4 ${
        isUser ? 'bg-transparent' : 'bg-slate-900/50'
      } ${isStreaming ? 'animate-pulse' : ''}`}
    >
      <Avatar className={`w-6 h-6 md:w-8 md:h-8 flex-shrink-0 ${isUser ? 'bg-blue-500' : agent?.color || 'bg-purple-500'}`}>
        <AvatarFallback className="text-[10px] md:text-sm">
          {isUser ? <User className="w-3 h-3 md:w-4 md:h-4" /> : agent?.avatar || <Bot className="w-3 h-3 md:w-4 md:h-4" />}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-1.5 md:gap-2 mb-1 flex-wrap">
          <span className="font-medium text-xs md:text-sm">
            {isUser ? 'You' : agent?.name || 'Assistant'}
          </span>
          {agent && !isUser && (
            <span className="text-[10px] md:text-xs text-slate-400 hidden sm:inline">({agent.description})</span>
          )}
          {message.model && (
            <span className="text-[10px] md:text-xs text-slate-500 hidden md:inline">· {message.model.split(':').pop()?.slice(0, 20)}</span>
          )}
          {message.tokens && (
            <span className="text-[10px] md:text-xs text-slate-500">· {message.tokens}t</span>
          )}
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-sm max-w-none text-xs md:text-sm">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              pre: ({ children }) => (
                <div className="relative group/code my-2 md:my-3">
                  <pre className="bg-slate-950 rounded-lg p-2 md:p-4 overflow-x-auto text-[10px] md:text-xs">
                    {children}
                  </pre>
                </div>
              ),
              code: ({ className, children }) => {
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : 'text';
                const code = String(children).replace(/\n$/, '');
                
                if (!className) {
                  return <code className="bg-slate-800 px-1 py-0.5 rounded text-[10px] md:text-xs">{children}</code>;
                }

                return (
                  <div className="my-2 md:my-3">
                    <div className="flex items-center justify-between bg-slate-900 px-2 md:px-3 py-1 rounded-t-lg border-b border-slate-800">
                      <span className="text-[9px] md:text-xs text-slate-400 uppercase">{language}</span>
                      <div className="flex gap-0.5 md:gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 md:h-6 px-1.5 md:px-2 text-[9px] md:text-xs"
                          onClick={() => openInCanvas(code, language)}
                        >
                          <Eye className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" />
                          <span className="hidden sm:inline">Canvas</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 md:h-6 px-1.5"
                          onClick={() => navigator.clipboard.writeText(code)}
                        >
                          <Copy className="w-2.5 h-2.5 md:w-3 md:h-3" />
                        </Button>
                      </div>
                    </div>
                    <code className={className}>{children}</code>
                  </div>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 md:gap-2 mt-1.5 md:mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" className="h-6 md:h-7 px-1.5 md:px-2 text-[9px] md:text-xs" onClick={handleCopy}>
            {copied ? <Check className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" /> : <Copy className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          
          {codeBlocks.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 md:h-7 px-1.5 md:px-2 text-[9px] md:text-xs"
              onClick={() => openInCanvas(codeBlocks[0].code, codeBlocks[0].language)}
            >
              <FileCode className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" />
              <span className="hidden sm:inline">Canvas</span>
            </Button>
          )}

          {message.isCompressed && (
            <span className="text-[9px] md:text-xs text-amber-400 flex items-center">
              <Sparkles className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5" />
              Compressed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
