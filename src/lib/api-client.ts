import {
  Question,
  QuestionStats,
  CreateQuestionInput,
  UpdateQuestionInput,
  QuestionsApiResponse,
} from '../types/question.ts';
import { ChatMessage, ChatResponse } from '../types/ai.ts';

const API_BASE = '/api';

export async function fetchQuestions(params?: {
  sessionId?: string;
  status?: string;
  search?: string;
}): Promise<QuestionsApiResponse> {
  const query = new URLSearchParams();
  if (params?.sessionId) query.set('sessionId', params.sessionId);
  if (params?.status) query.set('status', params.status);
  if (params?.search) query.set('search', params.search);

  const res = await fetch(`${API_BASE}/questions?${query.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch questions: ${res.statusText}`);
  }
  return res.json();
}

export async function submitQuestion(data: CreateQuestionInput): Promise<{ success: boolean; question: Question }> {
  const res = await fetch(`${API_BASE}/questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || 'Failed to submit question');
  }
  return body;
}

export async function updateQuestion(
  id: string,
  updates: UpdateQuestionInput
): Promise<{ success: boolean; question: Question }> {
  const res = await fetch(`${API_BASE}/questions/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || 'Failed to update question');
  }
  return body;
}

export async function deleteQuestion(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/questions/${id}`, {
    method: 'DELETE',
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || 'Failed to delete question');
  }
  return body;
}

export async function sendAIChat(params: {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  sessionId?: string;
  language?: 'ar' | 'en';
}): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || body.message || 'AI chat request failed');
  }
  return body;
}

export interface StreamEvent {
  type: 'NEW_QUESTION' | 'UPDATE_QUESTION' | 'DELETE_QUESTION' | 'STATS_UPDATE' | 'CONNECTED';
  question?: Question;
  questionId?: string;
  stats?: QuestionStats;
  timestamp?: string;
}

/**
 * Real-time SSE subscriber with auto-reconnection and polling fallback
 */
export function subscribeQuestionsStream(
  onEvent: (event: StreamEvent) => void,
  onError?: (err: unknown) => void
): () => void {
  let eventSource: EventSource | null = null;
  let pollingInterval: NodeJS.Timeout | null = null;
  let isClosed = false;

  const startSSE = () => {
    if (isClosed) return;
    try {
      eventSource = new EventSource(`${API_BASE}/questions/stream`);

      eventSource.onmessage = (event) => {
        try {
          const parsed: StreamEvent = JSON.parse(event.data);
          onEvent(parsed);
        } catch {
          // ignore heartbeat / ping
        }
      };

      eventSource.onerror = (err) => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (onError) onError(err);

        // Fallback to polling every 3 seconds if SSE disconnects
        if (!pollingInterval && !isClosed) {
          pollingInterval = setInterval(async () => {
            try {
              const data = await fetchQuestions();
              onEvent({
                type: 'STATS_UPDATE',
                stats: data.stats,
              });
            } catch {
              // ignore
            }
          }, 3000);
        }

        // Try reconnecting SSE after 8 seconds
        setTimeout(() => {
          if (!isClosed && !eventSource) {
            if (pollingInterval) {
              clearInterval(pollingInterval);
              pollingInterval = null;
            }
            startSSE();
          }
        }, 8000);
      };
    } catch (err) {
      if (onError) onError(err);
    }
  };

  startSSE();

  return () => {
    isClosed = true;
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  };
}
