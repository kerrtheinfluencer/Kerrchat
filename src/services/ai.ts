import type { Message, Agent, ModelConfig, CompressionResult, AgentThought } from '@/types';
import { useAgentStore, useModelStore, useSettingsStore } from '@/store';

// ============================================
// AI Service - Multi-Model & Multi-Agent
// ============================================

export class AIService {
  private abortController: AbortController | null = null;

  abort() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  // Get API key for provider
  private getApiKey(provider: string): string {
    const { apiKeys } = useSettingsStore.getState();
    const key = apiKeys[provider];
    if (!key) {
      // Return demo keys for free tier (user should replace with their own)
      switch (provider) {
        case 'openrouter':
          return localStorage.getItem('openrouter_api_key') || '';
        case 'groq':
          return localStorage.getItem('groq_api_key') || '';
        default:
          return '';
      }
    }
    return key;
  }

  // Get model identifier for API call
  private getModelIdentifier(model: ModelConfig): string {
    switch (model.provider) {
      case 'openrouter':
        // Extract the actual model name from our ID
        return model.id.replace('openrouter-', '').replace(/-/g, '/');
      case 'groq':
        return model.id.replace('groq-', '').replace(/-/g, '-');
      default:
        return model.id;
    }
  }

  // Stream chat completion
  async *streamChatCompletion(
    messages: Message[],
    modelConfig: ModelConfig,
    systemPrompt?: string,
    onThought?: (thought: string) => void
  ): AsyncGenerator<string, void, unknown> {
    this.abortController = new AbortController();

    const apiKey = this.getApiKey(modelConfig.provider);
    if (!apiKey) {
      throw new Error(
        `API key not found for ${modelConfig.provider}. Please set your API key in settings.`
      );
    }

    const formattedMessages = this.formatMessages(messages, systemPrompt);
    const modelId = this.getModelIdentifier(modelConfig);

    try {
      const response = await fetch(`${modelConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Multi-Agent AI Chat',
        },
        body: JSON.stringify({
          model: modelId,
          messages: formattedMessages,
          temperature: modelConfig.temperature,
          max_tokens: modelConfig.maxTokens,
          stream: true,
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.error?.message || `HTTP error! status: ${response.status}`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      // Check for reasoning/thinking in the response
      let isInThinkingMode = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '' || line.trim() === 'data: [DONE]') continue;

          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const delta = data.choices?.[0]?.delta;

              if (delta?.content) {
                const content = delta.content;
                fullContent += content;

                // Detect thinking tags (some models use <think> or similar)
                if (content.includes('<think>') || content.includes('<thinking>')) {
                  isInThinkingMode = true;
                }
                if (content.includes('</think>') || content.includes('</thinking>')) {
                  isInThinkingMode = false;
                }

                // Extract thoughts if in thinking mode
                if (isInThinkingMode && onThought) {
                  const thoughtContent = content
                    .replace(/<\/?think(ing)?>/g, '')
                    .trim();
                  if (thoughtContent) {
                    onThought(thoughtContent);
                  }
                }

                yield content;
              }

              // Handle reasoning content (DeepSeek R1 style)
              if (delta?.reasoning_content && onThought) {
                onThought(delta.reasoning_content);
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      throw error;
    }
  }

  // Non-streaming completion
  async chatCompletion(
    messages: Message[],
    modelConfig: ModelConfig,
    systemPrompt?: string
  ): Promise<string> {
    this.abortController = new AbortController();

    const apiKey = this.getApiKey(modelConfig.provider);
    if (!apiKey) {
      throw new Error(`API key not found for ${modelConfig.provider}`);
    }

    const formattedMessages = this.formatMessages(messages, systemPrompt);
    const modelId = this.getModelIdentifier(modelConfig);

    const response = await fetch(`${modelConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Multi-Agent AI Chat',
      },
      body: JSON.stringify({
        model: modelId,
        messages: formattedMessages,
        temperature: modelConfig.temperature,
        max_tokens: modelConfig.maxTokens,
        stream: false,
      }),
      signal: this.abortController.signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  // Format messages for API
  private formatMessages(
    messages: Message[],
    systemPrompt?: string
  ): Array<{ role: string; content: string }> {
    const formatted: Array<{ role: string; content: string }> = [];

    if (systemPrompt) {
      formatted.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
      if (msg.role === 'thought') continue; // Skip thought messages
      formatted.push({
        role: msg.role,
        content: msg.content,
      });
    }

    return formatted;
  }

  // Compress conversation
  async compressConversation(
    messages: Message[],
    modelConfig: ModelConfig
  ): Promise<CompressionResult> {
    const conversationText = messages
      .filter((m) => m.role !== 'thought')
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n\n');

    const prompt = `Please summarize the following conversation concisely while preserving all important information, decisions, and context. Extract key points and main topics discussed.

Conversation:
${conversationText}

Provide your response in this format:
SUMMARY: [2-3 sentence summary]
KEY_POINTS:
- [point 1]
- [point 2]
- [etc]`;

    const summary = await this.chatCompletion(
      [{ id: 'temp', role: 'user', content: prompt, timestamp: Date.now() }],
      modelConfig
    );

    // Parse the summary
    const summaryMatch = summary.match(/SUMMARY:\s*(.+?)(?=KEY_POINTS:|$)/s);
    const keyPointsMatch = summary.match(/KEY_POINTS:\s*([\s\S]+)/);

    const extractedSummary = summaryMatch?.[1]?.trim() || summary;
    const keyPoints = keyPointsMatch
      ? keyPointsMatch[1]
          .split('\n')
          .map((p) => p.trim().replace(/^- /, ''))
          .filter((p) => p)
      : [];

    const originalTokens = this.estimateTokens(conversationText);
    const compressedTokens = this.estimateTokens(extractedSummary);

    return {
      originalTokens,
      compressedTokens,
      summary: extractedSummary,
      keyPoints,
      preservedMessages: messages.slice(-3).map((m) => m.id), // Keep last 3 messages
    };
  }

  // Estimate token count (rough approximation)
  estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token for English
    return Math.ceil(text.length / 4);
  }

  // Generate embeddings for memory
  async generateEmbeddings(text: string, _modelConfig: ModelConfig): Promise<number[]> {
    // This would use an embedding model in production
    // For now, return a simple hash-based embedding
    const embedding: number[] = [];
    for (let i = 0; i < 128; i++) {
      let hash = 0;
      for (let j = 0; j < text.length; j++) {
        hash = ((hash << 5) - hash + text.charCodeAt(j) + i) | 0;
      }
      embedding.push(hash / 2147483647);
    }
    return embedding;
  }
}

// ============================================
// Multi-Agent Orchestrator
// ============================================

export class AgentOrchestrator {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  // Analyze task and determine which agents to involve
  async analyzeTask(userMessage: string): Promise<{
    primaryAgent: Agent;
    supportingAgents: Agent[];
    taskBreakdown: string[];
  }> {
    const { agents, activeAgentIds } = useAgentStore.getState();
    const { models } = useModelStore.getState();

    const activeAgents = agents.filter((a) => activeAgentIds.includes(a.id));
    const orchestrator = agents.find((a) => a.id === 'orchestrator');

    if (!orchestrator) {
      // Fallback to first active agent
      return {
        primaryAgent: activeAgents[0],
        supportingAgents: activeAgents.slice(1),
        taskBreakdown: [userMessage],
      };
    }

    const modelConfig = models.find((m) => m.id === orchestrator.model) || models[0];

    const agentDescriptions = activeAgents
      .map(
        (a) =>
          `- ${a.name} (${a.id}): ${a.description}. Capabilities: ${a.capabilities.join(', ')}`
      )
      .join('\n');

    const prompt = `Analyze this user request and determine the best agent assignment:

User Request: "${userMessage}"

Available Agents:
${agentDescriptions}

Respond in this format:
PRIMARY_AGENT: [agent_id]
SUPPORTING_AGENTS: [comma-separated agent_ids or "none"]
TASK_BREAKDOWN:
1. [subtask 1 - which agent handles it]
2. [subtask 2 - which agent handles it]
3. [etc]

Be strategic about agent selection based on their capabilities.`;

    try {
      const response = await this.aiService.chatCompletion(
        [{ id: 'temp', role: 'user', content: prompt, timestamp: Date.now() }],
        modelConfig,
        orchestrator.systemPrompt
      );

      // Parse response
      const primaryMatch = response.match(/PRIMARY_AGENT:\s*(\w+)/);
      const supportingMatch = response.match(/SUPPORTING_AGENTS:\s*([\w,\s]+)/);
      const breakdownMatch = response.match(/TASK_BREAKDOWN:\s*([\s\S]+)/);

      const primaryId = primaryMatch?.[1]?.trim() || activeAgents[0]?.id;
      const supportingIds = supportingMatch?.[1]
        ?.split(',')
        .map((s) => s.trim())
        .filter((s) => s !== 'none') || [];

      const taskBreakdown = breakdownMatch
        ? breakdownMatch[1]
            .split('\n')
            .map((t) => t.trim().replace(/^\d+\.\s*/, ''))
            .filter((t) => t)
        : [userMessage];

      const primaryAgent = agents.find((a) => a.id === primaryId) || activeAgents[0];
      const supportingAgents = agents.filter((a) => supportingIds.includes(a.id));

      return { primaryAgent, supportingAgents, taskBreakdown };
    } catch (error) {
      // Fallback
      return {
        primaryAgent: activeAgents[0],
        supportingAgents: activeAgents.slice(1),
        taskBreakdown: [userMessage],
      };
    }
  }

  // Execute multi-agent collaboration
  async *executeCollaboration(
    userMessage: string,
    chatHistory: Message[],
    onAgentThought: (thought: AgentThought) => void
  ): AsyncGenerator<
    { type: 'thought' | 'content' | 'agent_switch'; data: unknown },
    void,
    unknown
  > {
    const { models, selectedModel } = useModelStore.getState();

    // Analyze task
    const analysis = await this.analyzeTask(userMessage);

    // Notify about primary agent
    yield {
      type: 'agent_switch',
      data: { agent: analysis.primaryAgent, role: 'primary' },
    };

    // Primary agent generates initial response with thoughts
    const primaryModel =
      models.find((m) => m.id === analysis.primaryAgent.model) ||
      models.find((m) => m.id === selectedModel) ||
      models[0];

    let fullResponse = '';

    // Stream from primary agent
    for await (const chunk of this.aiService.streamChatCompletion(
      [...chatHistory, { id: 'temp', role: 'user', content: userMessage, timestamp: Date.now() }],
      primaryModel,
      analysis.primaryAgent.systemPrompt,
      (thought) => {
        onAgentThought({
          agentId: analysis.primaryAgent.id,
          agentName: analysis.primaryAgent.name,
          thought,
          timestamp: Date.now(),
          type: 'reasoning',
        });
      }
    )) {
      fullResponse += chunk;
      yield { type: 'content', data: chunk };
    }

    // If supporting agents are needed, get their input
    for (const supportingAgent of analysis.supportingAgents.slice(0, 2)) {
      yield {
        type: 'agent_switch',
        data: { agent: supportingAgent, role: 'supporting' },
      };

      onAgentThought({
        agentId: supportingAgent.id,
        agentName: supportingAgent.name,
        thought: `Reviewing and enhancing the response from ${analysis.primaryAgent.name}...`,
        timestamp: Date.now(),
        type: 'collaboration',
      });

      const supportingModel =
        models.find((m) => m.id === supportingAgent.model) || models[0];

      const reviewPrompt = `The user asked: "${userMessage}"

${analysis.primaryAgent.name} responded: "${fullResponse}"

As ${supportingAgent.name}, please review this response and provide any corrections, additions, or improvements. Focus on your expertise: ${supportingAgent.capabilities.join(', ')}.

If the response is good, simply say "The response looks good." Otherwise, provide your suggested improvements.`;

      try {
        const reviewResponse = await this.aiService.chatCompletion(
          [{ id: 'temp', role: 'user', content: reviewPrompt, timestamp: Date.now() }],
          supportingModel,
          supportingAgent.systemPrompt
        );

        if (!reviewResponse.toLowerCase().includes('looks good')) {
          onAgentThought({
            agentId: supportingAgent.id,
            agentName: supportingAgent.name,
            thought: `Suggested improvements: ${reviewResponse.substring(0, 200)}...`,
            timestamp: Date.now(),
            type: 'reflection',
          });
        }
      } catch (e) {
        // Continue if review fails
      }
    }
  }

  // Generate agent thought process
  async generateThought(
    agent: Agent,
    context: string,
    task: string
  ): Promise<string> {
    const { models } = useModelStore.getState();
    const modelConfig = models.find((m) => m.id === agent.model) || models[0];

    const prompt = `Context: ${context}

Task: ${task}

As ${agent.name}, explain your thought process for approaching this task. What are you considering? What's your strategy?`;

    try {
      const thought = await this.aiService.chatCompletion(
        [{ id: 'temp', role: 'user', content: prompt, timestamp: Date.now() }],
        modelConfig,
        agent.systemPrompt
      );
      return thought;
    } catch (e) {
      return `Analyzing task as ${agent.name}...`;
    }
  }
}

// ============================================
// Memory Service
// ============================================

export class MemoryService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  // Extract memories from conversation
  async extractMemories(
    messages: Message[],
    _chatId: string
  ): Promise<Array<{ content: string; type: 'fact' | 'preference' | 'context'; importance: number }>> {
    const { models, selectedModel } = useModelStore.getState();
    const modelConfig = models.find((m) => m.id === selectedModel) || models[0];

    const conversationText = messages
      .filter((m) => m.role !== 'thought')
      .slice(-10)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n\n');

    const prompt = `Analyze this conversation and extract important memories that should be remembered for future context. Focus on:
1. Facts about the user (preferences, background, goals)
2. Important information shared
3. Context that would be useful in future conversations

Conversation:
${conversationText}

Respond with a JSON array of memories:
[
  { "content": "memory text", "type": "fact|preference|context", "importance": 1-10 }
]`;

    try {
      const response = await this.aiService.chatCompletion(
        [{ id: 'temp', role: 'user', content: prompt, timestamp: Date.now() }],
        modelConfig
      );

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const memories = JSON.parse(jsonMatch[0]);
        return memories.map((m: { content: string; type: string; importance: number }) => ({
          content: m.content,
          type: m.type as 'fact' | 'preference' | 'context',
          importance: m.importance,
        }));
      }
    } catch (e) {
      // Return empty if parsing fails
    }

    return [];
  }

  // Find relevant memories
  findRelevantMemories(query: string, memories: import('@/types').Memory[]): import('@/types').Memory[] {
    // Simple keyword matching (in production, use embeddings)
    const queryWords = query.toLowerCase().split(/\s+/);
    return memories
      .filter((m) => {
        const contentWords = m.content.toLowerCase();
        return queryWords.some((w) => contentWords.includes(w));
      })
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 5);
  }

  // Build context from memories
  buildMemoryContext(memories: import('@/types').Memory[]): string {
    if (memories.length === 0) return '';

    return `Relevant context from previous conversations:\n${memories
      .map((m) => `- ${m.content}`)
      .join('\n')}\n`;
  }
}

// ============================================
// Singleton Instances
// ============================================

export const aiService = new AIService();
export const agentOrchestrator = new AgentOrchestrator();
export const memoryService = new MemoryService();
