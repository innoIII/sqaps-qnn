export type QuestionStatus = 'NEW' | 'ANSWERED' | 'ARCHIVED';

export interface Question {
  id: string;
  question: string;
  status: QuestionStatus;
  source: 'qr' | 'direct' | 'session';
  sessionId: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  category?: string;
  upvotes?: number;
  lecturerNotes?: string;
}

export interface CreateQuestionInput {
  question: string;
  source?: 'qr' | 'direct' | 'session';
  sessionId?: string;
  category?: string;
}

export interface UpdateQuestionInput {
  status?: QuestionStatus;
  lecturerNotes?: string;
  upvotes?: number;
}

export interface QuestionStats {
  total: number;
  unanswered: number;
  answered: number;
  archived: number;
  latestCreatedAt: string | null;
}

export interface QuestionsApiResponse {
  success: boolean;
  questions: Question[];
  stats: QuestionStats;
  sessionId?: string;
}

export interface SingleQuestionApiResponse {
  success: boolean;
  question?: Question;
  error?: string;
}
