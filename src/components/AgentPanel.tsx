import { useState } from 'react';
import {
  Bot,
  Brain,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Activity,
  MessageSquare,
  Code,
  Search,
  Palette,
  Calculator,
  CheckCircle,
  Plus,
  Trash2,
  Edit2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAgentStore, useSettingsStore } from '@/store';
import type { Agent, AgentCapability } from '@/types';

interface AgentPanelProps {
  onClose?: () => void;
  isMobile?: boolean;
}

const capabilityIcons: Record<AgentCapability, typeof Code> = {
  coding: Code,
  reasoning: Brain,
  creative: Palette,
  analysis: Activity,
  research: Search,
  planning: CheckCircle,
  review: CheckCircle,
  math: Calculator,
};

const capabilityColors: Record<AgentCapability, string> = {
  coding: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  reasoning: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  creative: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  analysis: 'bg-green-500/20 text-green-400 border-green-500/30',
  research: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  planning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  review: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  math: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

export function AgentPanel({ onClose, isMobile }: AgentPanelProps) {
  const { agents, activeAgentIds, thoughts, toggleAgent, addAgent, updateAgent, deleteAgent } =
    useAgentStore();
  const { showThoughts, updateSettings } = useSettingsStore();
  const [expandedThoughts, setExpandedThoughts] = useState(true);
  const [expandedAgents, setExpandedAgents] = useState(true);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const activeAgents = agents.filter((a) => activeAgentIds.includes(a.id));

  return (
    <div className="h-full flex flex-col bg-slate-900 border-l border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
          <span className="font-semibold text-sm md:text-base">Agents</span>
          <Badge variant="secondary" className="text-[10px] md:text-xs">
            {activeAgents.length}/{agents.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Switch
              checked={showThoughts}
              onCheckedChange={(v) => updateSettings({ showThoughts: v })}
              className="scale-75"
            />
            <span className="text-[10px] md:text-xs text-slate-400 hidden sm:inline">Thoughts</span>
          </div>
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* Active Agents Section */}
        <Collapsible open={expandedAgents} onOpenChange={setExpandedAgents}>
          <CollapsibleTrigger className="flex items-center justify-between w-full px-3 md:px-4 py-2 hover:bg-slate-800/50">
            <span className="text-xs md:text-sm font-medium text-slate-300">Active Agents</span>
            {expandedAgents ? (
              <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-500" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-500" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-1.5 md:px-2 pb-2 space-y-0.5">
              {agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  isActive={activeAgentIds.includes(agent.id)}
                  onToggle={() => toggleAgent(agent.id)}
                  onEdit={() => setEditingAgent(agent)}
                />
              ))}

              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-slate-400 hover:text-slate-200 text-sm"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Add Custom Agent
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Thoughts Section */}
        {showThoughts && thoughts.length > 0 && (
          <Collapsible open={expandedThoughts} onOpenChange={setExpandedThoughts}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-3 md:px-4 py-2 hover:bg-slate-800/50 border-t border-slate-800">
              <span className="text-xs md:text-sm font-medium text-slate-300">Agent Thoughts</span>
              {expandedThoughts ? (
                <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-500" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-500" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-1.5 md:px-2 pb-2 space-y-1">
                {thoughts.slice(-20).map((thought, idx) => (
                  <ThoughtCard key={idx} thought={thought} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </ScrollArea>

      {/* Add Agent Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Create Custom Agent</DialogTitle>
          </DialogHeader>
          <AddAgentForm
            onSubmit={(agent) => {
              addAgent(agent);
              setIsAddDialogOpen(false);
            }}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Agent Dialog */}
      <Dialog open={!!editingAgent} onOpenChange={() => setEditingAgent(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Edit Agent</DialogTitle>
          </DialogHeader>
          {editingAgent && (
            <EditAgentForm
              agent={editingAgent}
              onSubmit={(updates) => {
                updateAgent(editingAgent.id, updates);
                setEditingAgent(null);
              }}
              onDelete={() => {
                deleteAgent(editingAgent.id);
                setEditingAgent(null);
              }}
              onCancel={() => setEditingAgent(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AgentCard({
  agent,
  isActive,
  onToggle,
  onEdit,
}: {
  agent: Agent;
  isActive: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  return (
    <div
      className={`group flex items-start gap-2 p-2 rounded-lg transition-colors ${
        isActive ? 'bg-slate-800/50' : 'hover:bg-slate-800/30'
      }`}
    >
      <Switch checked={isActive} onCheckedChange={onToggle} className="mt-0.5 scale-90" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-base md:text-lg">{agent.avatar}</span>
          <span className={`font-medium text-xs md:text-sm ${isActive ? 'text-white' : 'text-slate-400'}`}>
            {agent.name}
          </span>
        </div>

        <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 line-clamp-2">{agent.description}</p>

        <div className="flex flex-wrap gap-1 mt-1">
          {agent.capabilities.slice(0, 3).map((cap) => {
            const Icon = capabilityIcons[cap];
            return (
              <Badge
                key={cap}
                variant="outline"
                className={`text-[9px] md:text-[10px] px-1 py-0 h-4 md:h-5 ${capabilityColors[cap]}`}
              >
                <Icon className="w-2 h-2 md:w-2.5 md:h-2.5 mr-0.5" />
                <span className="hidden sm:inline capitalize">{cap}</span>
              </Badge>
            );
          })}
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
        onClick={onEdit}
      >
        <Edit2 className="w-3 h-3" />
      </Button>
    </div>
  );
}

function ThoughtCard({ thought }: { thought: import('@/types').AgentThought }) {
  const { agents } = useAgentStore();
  const agent = agents.find((a) => a.id === thought.agentId);

  const typeColors = {
    reasoning: 'text-purple-400',
    planning: 'text-blue-400',
    reflection: 'text-amber-400',
    collaboration: 'text-green-400',
  };

  const typeIcons = {
    reasoning: Brain,
    planning: CheckCircle,
    reflection: Sparkles,
    collaboration: MessageSquare,
  };

  const Icon = typeIcons[thought.type];

  return (
    <div className="p-2 rounded-lg bg-slate-800/30 text-[10px] md:text-xs">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-2.5 h-2.5 md:w-3 md:h-3 ${typeColors[thought.type]}`} />
        <span className="font-medium text-slate-300">{agent?.name || thought.agentName}</span>
        <span className="text-slate-500">·</span>
        <span className="text-slate-500 capitalize">{thought.type}</span>
      </div>
      <p className="text-slate-400 line-clamp-3">{thought.thought}</p>
    </div>
  );
}

function AddAgentForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (agent: Agent) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [capabilities, setCapabilities] = useState<AgentCapability[]>([]);

  const allCapabilities: AgentCapability[] = [
    'coding',
    'reasoning',
    'creative',
    'analysis',
    'research',
    'planning',
    'review',
    'math',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: `custom_${Date.now()}`,
      name,
      description,
      avatar: '🤖',
      color: '#6366f1',
      model: 'openrouter:meta-llama/llama-3.3-70b-instruct:free',
      systemPrompt,
      capabilities,
      isActive: true,
      temperature: 0.7,
      maxTokens: 4096,
    });
  };

  const toggleCapability = (cap: AgentCapability) => {
    setCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Agent" />
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does this agent do?"
        />
      </div>

      <div>
        <label className="text-sm font-medium">System Prompt</label>
        <Textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="Instructions for the agent..."
          rows={4}
        />
      </div>

      <div>
        <label className="text-sm font-medium">Capabilities</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {allCapabilities.map((cap) => (
            <Badge
              key={cap}
              variant={capabilities.includes(cap) ? 'default' : 'outline'}
              className="cursor-pointer capitalize text-xs"
              onClick={() => toggleCapability(cap)}
            >
              {cap}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Create Agent</Button>
      </div>
    </form>
  );
}

function EditAgentForm({
  agent,
  onSubmit,
  onDelete,
  onCancel,
}: {
  agent: Agent;
  onSubmit: (updates: Partial<Agent>) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(agent.name);
  const [description, setDescription] = useState(agent.description);
  const [systemPrompt, setSystemPrompt] = useState(agent.systemPrompt);
  const [temperature, setTemperature] = useState(agent.temperature);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      description,
      systemPrompt,
      temperature,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div>
        <label className="text-sm font-medium">System Prompt</label>
        <Textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={4} />
      </div>

      <div>
        <label className="text-sm font-medium">Temperature: {temperature}</label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-2">
        <Button type="button" variant="destructive" onClick={onDelete} className="w-full sm:w-auto">
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </Button>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button type="submit" className="flex-1 sm:flex-none">
            Save
          </Button>
        </div>
      </div>
    </form>
  );
}
