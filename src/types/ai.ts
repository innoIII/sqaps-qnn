export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id?: string;
  role: MessageRole;
  content: string;
  suggestedQuestion?: string;
  timestamp?: string;
}

export interface ChatRequest {
  messages: Array<{
    role: MessageRole;
    content: string;
  }>;
  sessionId?: string;
  language?: 'ar' | 'en';
}

export interface ChatResponse {
  success: boolean;
  message: string;
  suggestedQuestion?: string;
  provider: string;
  error?: string;
}

export type AIProviderType = 'gemini' | 'openai' | 'fallback';

export interface AIServiceConfig {
  provider: AIProviderType;
  model: string;
  maxTokens: number;
  maxRequestsPerSession: number;
}
