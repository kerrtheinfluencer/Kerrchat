import { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Archive,
  MoreHorizontal,
  Sparkles,
  Zap,
  Brain,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useChatStore } from '@/store';
import { formatDistanceToNow } from '@/lib/utils';

interface SidebarProps {
  onClose?: () => void;
  isMobile?: boolean;
}

export function Sidebar({ onClose, isMobile }: SidebarProps) {
  const { chats, currentChatId, createChat, deleteChat, archiveChat, setCurrentChat } =
    useChatStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChats = chats
    .filter(
      (chat) =>
        !chat.isArchived &&
        (chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          chat.messages.some((m) =>
            m.content.toLowerCase().includes(searchQuery.toLowerCase())
          ))
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const archivedChats = chats.filter((chat) => chat.isArchived);

  const handleNewChat = () => {
    const chatId = createChat();
    setCurrentChat(chatId);
    onClose?.();
  };

  const handleSelectChat = (chatId: string) => {
    setCurrentChat(chatId);
    onClose?.();
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 border-r border-slate-800">
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Brain className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base md:text-lg">Multi-Agent AI</h1>
              <p className="text-[10px] md:text-xs text-slate-500">Smart Collaboration</p>
            </div>
          </div>
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        <Button onClick={handleNewChat} className="w-full gap-2 text-sm">
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 md:px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="pl-9 text-sm"
          />
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-0.5 py-2">
          {filteredChats.length === 0 ? (
            <div className="text-center py-6 md:py-8 text-slate-500">
              <MessageSquare className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No chats yet</p>
              <p className="text-xs">Start a new conversation</p>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <ChatItem
                key={chat.id}
                chat={chat}
                isActive={chat.id === currentChatId}
                onClick={() => handleSelectChat(chat.id)}
                onDelete={() => deleteChat(chat.id)}
                onArchive={() => archiveChat(chat.id)}
              />
            ))
          )}
        </div>

        {/* Archived Section */}
        {archivedChats.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <p className="px-2 text-xs font-medium text-slate-500 mb-2">
              Archived ({archivedChats.length})
            </p>
            {archivedChats.map((chat) => (
              <ChatItem
                key={chat.id}
                chat={chat}
                isActive={chat.id === currentChatId}
                onClick={() => handleSelectChat(chat.id)}
                onDelete={() => deleteChat(chat.id)}
                onArchive={() => {}}
                isArchived
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer Stats */}
      <div className="p-3 md:p-4 border-t border-slate-800">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3 md:gap-4">
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {chats.length}
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {(chats.reduce((acc, c) => acc + c.tokenCount, 0) / 1000).toFixed(1)}k
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatItem({
  chat,
  isActive,
  onClick,
  onDelete,
  onArchive,
  isArchived,
}: {
  chat: import('@/types').Chat;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  onArchive: () => void;
  isArchived?: boolean;
}) {
  const lastMessage = chat.messages[chat.messages.length - 1];

  return (
    <button
      onClick={onClick}
      className={`w-full group flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg transition-colors text-left ${
        isActive
          ? 'bg-slate-800'
          : 'hover:bg-slate-800/50'
      } ${isArchived ? 'opacity-60' : ''}`}
    >
      <MessageSquare className="w-3.5 h-3.5 md:w-4 md:h-4 mt-0.5 text-slate-500 flex-shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`font-medium text-xs md:text-sm truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
            {chat.title}
          </span>
          <span className="text-[10px] md:text-xs text-slate-500 flex-shrink-0 ml-1">
            {formatDistanceToNow(chat.updatedAt)}
          </span>
        </div>

        <p className="text-[10px] md:text-xs text-slate-500 truncate mt-0.5">
          {lastMessage
            ? `${lastMessage.role === 'user' ? 'You: ' : ''}${lastMessage.content.substring(0, 40)}...`
            : 'No messages yet'}
        </p>

        <div className="flex items-center gap-1.5 mt-1">
          {chat.agentIds.length > 0 && (
            <Badge variant="outline" className="text-[9px] md:text-[10px] px-1 py-0 h-4">
              {chat.agentIds.length} agents
            </Badge>
          )}
          {chat.isCompressed && (
            <Badge variant="secondary" className="text-[9px] md:text-[10px] px-1 py-0 h-4">
              <Sparkles className="w-2 h-2 mr-0.5" />
              Compressed
            </Badge>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!isArchived && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(); }}>
              <Archive className="w-4 h-4 mr-2" />
              Archive
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-red-400"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </button>
  );
}
