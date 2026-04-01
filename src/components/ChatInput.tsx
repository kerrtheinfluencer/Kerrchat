import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Mic,
  MicOff,
  Image as ImageIcon,
  FileText,
  X,
  Sparkles,
  Cpu,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useSettingsStore, useModelStore, useAgentStore } from '@/store';
import { useMobile } from '@/hooks/useMobile';

interface ChatInputProps {
  onSend: (message: string, attachments?: File[]) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isMobile } = useMobile();

  const { enableVoice, showThoughts } = useSettingsStore();
  const { models, selectedModel, setSelectedModel } = useModelStore();
  const { activeAgentIds } = useAgentStore();

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, isMobile ? 120 : 200)}px`;
    }
  }, [message, isMobile]);

  const handleSend = useCallback(() => {
    if (!message.trim() && attachments.length === 0) return;
    if (isLoading || disabled) return;

    onSend(message, attachments);
    setMessage('');
    setAttachments([]);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [message, attachments, isLoading, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAttachments((prev) => [...prev, ...files]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Speech recognition is not supported in your browser');
      return;
    }

    const SpeechRecognition =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      setMessage(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      toast.error('Speech recognition failed');
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  const selectedModelConfig = models.find((m) => m.id === selectedModel);

  return (
    <div className="border-t border-slate-800 bg-slate-950 p-2 md:p-4">
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 md:gap-2 mb-2 md:mb-3">
          {attachments.map((file, idx) => (
            <Badge
              key={idx}
              variant="secondary"
              className="flex items-center gap-1 px-1.5 md:px-2 py-0.5 text-[10px] md:text-xs"
            >
              {file.type.startsWith('image/') ? (
                <ImageIcon className="w-2.5 h-2.5 md:w-3 md:h-3" />
              ) : (
                <FileText className="w-2.5 h-2.5 md:w-3 md:h-3" />
              )}
              <span className="max-w-[80px] md:max-w-[150px] truncate">{file.name}</span>
              <button
                onClick={() => removeAttachment(idx)}
                className="ml-0.5 hover:text-red-400"
              >
                <X className="w-2.5 h-2.5 md:w-3 md:h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-1.5 md:gap-2">
        {/* Attach Button */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          className="hidden"
        />
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 h-9 w-9 md:h-10 md:w-10"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          <Paperclip className="w-4 h-4 md:w-5 md:h-5" />
        </Button>

        {/* Textarea */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isMobile ? "Type message..." : "Type your message... (Shift+Enter for new line)"}
            className="min-h-[40px] md:min-h-[44px] max-h-[120px] md:max-h-[200px] pr-10 md:pr-12 resize-none text-sm"
            disabled={isLoading || disabled}
            rows={1}
          />

          {/* Voice Input */}
          {enableVoice && (
            <Button
              variant="ghost"
              size="icon"
              className={`absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 h-7 w-7 md:h-8 md:w-8 ${
                isRecording ? 'text-red-500 animate-pulse' : ''
              }`}
              onClick={startRecording}
              disabled={isLoading}
            >
              {isRecording ? <MicOff className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Mic className="w-3.5 h-3.5 md:w-4 md:h-4" />}
            </Button>
          )}
        </div>

        {/* Model Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="flex-shrink-0 gap-1 md:gap-2 h-9 md:h-10 px-2 md:px-3" 
              disabled={isLoading}
            >
              <Cpu className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline max-w-[80px] md:max-w-[100px] truncate text-xs md:text-sm">
                {selectedModelConfig?.name || 'Select'}
              </span>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 md:w-64">
            {models.map((model) => (
              <DropdownMenuItem
                key={model.id}
                onClick={() => setSelectedModel(model.id)}
                className="flex items-center justify-between py-2"
              >
                <div>
                  <div className="font-medium text-sm">{model.name}</div>
                  <div className="text-[10px] md:text-xs text-slate-500">
                    {(model.contextWindow / 1000).toFixed(0)}k context · {model.provider}
                  </div>
                </div>
                {model.isFree && (
                  <Badge variant="secondary" className="text-[9px] md:text-[10px]">
                    Free
                  </Badge>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={(!message.trim() && attachments.length === 0) || isLoading || disabled}
          className="flex-shrink-0 h-9 w-9 md:h-10 md:w-10 p-0"
        >
          {isLoading ? (
            <Sparkles className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
          ) : (
            <Send className="w-4 h-4 md:w-5 md:h-5" />
          )}
        </Button>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between mt-1.5 md:mt-2 text-[10px] md:text-xs text-slate-500">
        <div className="flex items-center gap-2 md:gap-4">
          <span>{activeAgentIds.length} agents</span>
          {showThoughts && <span className="hidden sm:inline">Thoughts on</span>}
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <span className="hidden sm:inline">Enter to send</span>
          <span>{message.length}</span>
        </div>
      </div>
    </div>
  );
}
