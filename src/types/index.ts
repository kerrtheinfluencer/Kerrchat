// ============================================
// Multi-Agent AI Chat - Type Definitions
// ============================================

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'thought';
  content: string;
  timestamp: number;
  model?: string;
  agentId?: string;
  attachments?: Attachment[];
  codeBlocks?: CodeBlock[];
  tokens?: number;
  isCompressed?: boolean;
  compressedSummary?: string;
}

export interface Attachment {
  id: string;
  type: 'image' | 'file' | 'audio';
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface CodeBlock {
  id: string;
  language: string;
  code: string;
  filename?: string;
  isPreviewOpen?: boolean;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model: string;
  agentIds: string[];
  isArchived: boolean;
  isCompressed?: boolean;
  tokenCount: number;
  contextWindow: number;
  metadata: ChatMetadata;
}

export interface ChatMetadata {
  topic?: string;
  summary?: string;
  keyPoints: string[];
  entities: string[];
  relatedChatIds: string[];
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  avatar: string;
  color: string;
  model: string;
  systemPrompt: string;
  capabilities: AgentCapability[];
  isActive: boolean;
  temperature: number;
  maxTokens: number;
  thoughtProcess?: string;
}

export type AgentCapability = 
  | 'coding' 
  | 'reasoning' 
  | 'creative' 
  | 'analysis' 
  | 'research' 
  | 'planning'
  | 'review'
  | 'math';

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'openrouter' | 'groq' | 'google' | 'ollama' | 'custom';
  baseUrl: string;
  apiKey?: string;
  maxTokens: number;
  temperature: number;
  isFree: boolean;
  capabilities: ModelCapability[];
  contextWindow: number;
}

export type ModelCapability = 
  | 'chat' 
  | 'code' 
  | 'vision' 
  | 'function-calling' 
  | 'json-mode' 
  | 'streaming';

export interface Memory {
  id: string;
  content: string;
  type: 'fact' | 'preference' | 'context' | 'summary';
  chatIds: string[];
  createdAt: number;
  importance: number;
  embeddings?: number[];
}

export interface CompressionResult {
  originalTokens: number;
  compressedTokens: number;
  summary: string;
  keyPoints: string[];
  preservedMessages: string[];
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
  cost: number;
}

export interface CanvasFile {
  id: string;
  name: string;
  language: string;
  content: string;
  isActive: boolean;
  lastModified: number;
}

export interface AgentThought {
  agentId: string;
  agentName: string;
  thought: string;
  timestamp: number;
  type: 'reasoning' | 'planning' | 'reflection' | 'collaboration';
}

export interface OrchestratorPlan {
  id: string;
  task: string;
  assignedAgents: string[];
  steps: PlanStep[];
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

export interface PlanStep {
  id: string;
  description: string;
  agentId: string;
  dependencies: string[];
  status: 'pending' | 'in-progress' | 'completed';
  output?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  defaultModel: string;
  activeAgents: string[];
  autoCompress: boolean;
  compressionThreshold: number;
  maxContextWindow: number;
  showThoughts: boolean;
  enableVoice: boolean;
  language: string;
  apiKeys: Record<string, string>;
}
