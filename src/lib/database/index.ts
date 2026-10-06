import fs from 'fs';
import path from 'path';
import { Question, QuestionStatus, QuestionStats, CreateQuestionInput, UpdateQuestionInput } from '../../types/question.ts';

export type DatabaseEventType = 'NEW_QUESTION' | 'UPDATE_QUESTION' | 'DELETE_QUESTION' | 'STATS_UPDATE';

export interface DatabaseEvent {
  type: DatabaseEventType;
  question?: Question;
  questionId?: string;
  stats?: QuestionStats;
  timestamp: string;
}

type DatabaseListener = (event: DatabaseEvent) => void;

class QuestionDatabase {
  private questions: Map<string, Question> = new Map();
  private listeners: Set<DatabaseListener> = new Set();
  private dataFilePath: string;
  private isNode: boolean;

  constructor() {
    this.isNode = typeof process !== 'undefined' && Boolean(process.versions?.node);
    this.dataFilePath = path.join(process.cwd?.() || '', 'data', 'questions.json');
    this.initSeedData();
    this.loadFromDisk();
  }

  private initSeedData() {
    // Seed with realistic demo questions if completely fresh
    const now = new Date();
    const demoQuestions: Question[] = [
      {
        id: 'q-demo-1',
        question: 'هل يمكن توضيح الفرق بين الخوارزميات التكرارية وخوارزميات البرمجة الديناميكية بمثال عملي؟',
        status: 'ANSWERED',
        source: 'qr',
        sessionId: 'lecture-101',
        createdAt: new Date(now.getTime() - 1000 * 60 * 25).toISOString(),
        updatedAt: new Date(now.getTime() - 1000 * 60 * 15).toISOString(),
        lecturerNotes: 'تم الشرح على السبورة باستخدام مثال تسلسل فيبوناتشي',
      },
      {
        id: 'q-demo-2',
        question: 'ما هي الحالات التي يُفضل فيها استخدام SSE (Server-Sent Events) بدلاً من WebSockets؟',
        status: 'NEW',
        source: 'qr',
        sessionId: 'lecture-101',
        createdAt: new Date(now.getTime() - 1000 * 60 * 8).toISOString(),
        updatedAt: new Date(now.getTime() - 1000 * 60 * 8).toISOString(),
      },
      {
        id: 'q-demo-3',
        question: 'How do we handle rate-limiting and connection reconnections when deploying real-time APIs to production?',
        status: 'NEW',
        source: 'qr',
        sessionId: 'lecture-101',
        createdAt: new Date(now.getTime() - 1000 * 60 * 3).toISOString(),
        updatedAt: new Date(now.getTime() - 1000 * 60 * 3).toISOString(),
      },
    ];

    for (const q of demoQuestions) {
      this.questions.set(q.id, q);
    }
  }

  private loadFromDisk() {
    if (!this.isNode) return;
    try {
      if (fs.existsSync(this.dataFilePath)) {
        const raw = fs.readFileSync(this.dataFilePath, 'utf-8');
        const list: Question[] = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) {
          this.questions.clear();
          for (const q of list) {
            this.questions.set(q.id, q);
          }
        }
      }
    } catch {
      // ignore read errors, fallback to in-memory
    }
  }

  private saveToDisk() {
    if (!this.isNode) return;
    try {
      const dir = path.dirname(this.dataFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const list = Array.from(this.questions.values());
      fs.writeFileSync(this.dataFilePath, JSON.stringify(list, null, 2), 'utf-8');
    } catch {
      // ignore write errors in restricted sandboxes
    }
  }

  public subscribe(listener: DatabaseListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: DatabaseEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in database event listener:', err);
      }
    }
  }

  public getAll(filters?: { sessionId?: string; status?: QuestionStatus; search?: string }): Question[] {
    let list = Array.from(this.questions.values());

    if (filters?.sessionId && filters.sessionId.trim() !== '') {
      list = list.filter((q) => q.sessionId.toLowerCase() === filters.sessionId!.toLowerCase());
    }

    if (filters?.status) {
      list = list.filter((q) => q.status === filters.status);
    }

    if (filters?.search && filters.search.trim() !== '') {
      const term = filters.search.toLowerCase().trim();
      list = list.filter((q) => q.question.toLowerCase().includes(term));
    }

    // Sort newest first
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getById(id: string): Question | undefined {
    return this.questions.get(id);
  }

  public create(input: CreateQuestionInput): Question {
    const now = new Date().toISOString();
    // Unique ID generator
    const id = `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    const newQuestion: Question = {
      id,
      question: input.question.trim(),
      status: 'NEW',
      source: input.source || 'qr',
      sessionId: (input.sessionId || 'lecture-101').trim(),
      createdAt: now,
      updatedAt: now,
      category: input.category,
      upvotes: 0,
    };

    this.questions.set(id, newQuestion);
    this.saveToDisk();

    this.emit({
      type: 'NEW_QUESTION',
      question: newQuestion,
      stats: this.getStats(newQuestion.sessionId),
      timestamp: now,
    });

    return newQuestion;
  }

  public update(id: string, updates: UpdateQuestionInput): Question | null {
    const existing = this.questions.get(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated: Question = {
      ...existing,
      status: updates.status ?? existing.status,
      lecturerNotes: updates.lecturerNotes ?? existing.lecturerNotes,
      upvotes: updates.upvotes !== undefined ? updates.upvotes : existing.upvotes,
      updatedAt: now,
    };

    this.questions.set(id, updated);
    this.saveToDisk();

    this.emit({
      type: 'UPDATE_QUESTION',
      question: updated,
      stats: this.getStats(updated.sessionId),
      timestamp: now,
    });

    return updated;
  }

  public delete(id: string): boolean {
    const existing = this.questions.get(id);
    if (!existing) return false;

    this.questions.delete(id);
    this.saveToDisk();

    const now = new Date().toISOString();
    this.emit({
      type: 'DELETE_QUESTION',
      questionId: id,
      stats: this.getStats(existing.sessionId),
      timestamp: now,
    });

    return true;
  }

  public getStats(sessionId?: string): QuestionStats {
    let list = Array.from(this.questions.values());
    if (sessionId && sessionId.trim() !== '') {
      list = list.filter((q) => q.sessionId.toLowerCase() === sessionId.toLowerCase());
    }

    let unanswered = 0;
    let answered = 0;
    let archived = 0;
    let latestCreatedAt: string | null = null;

    for (const q of list) {
      if (q.status === 'NEW') unanswered++;
      else if (q.status === 'ANSWERED') answered++;
      else if (q.status === 'ARCHIVED') archived++;

      if (!latestCreatedAt || new Date(q.createdAt).getTime() > new Date(latestCreatedAt).getTime()) {
        latestCreatedAt = q.createdAt;
      }
    }

    return {
      total: list.length,
      unanswered,
      answered,
      archived,
      latestCreatedAt,
    };
  }

  public clearSession(sessionId?: string): number {
    let count = 0;
    for (const [id, q] of this.questions.entries()) {
      if (!sessionId || q.sessionId === sessionId) {
        this.questions.delete(id);
        count++;
      }
    }
    this.saveToDisk();
    this.emit({
      type: 'STATS_UPDATE',
      stats: this.getStats(sessionId),
      timestamp: new Date().toISOString(),
    });
    return count;
  }
}

// Global singleton instance so memory state is preserved across hot reloads
const globalForDb = globalThis as unknown as { __questionDbInstance?: QuestionDatabase };

export const questionDb = globalForDb.__questionDbInstance || new QuestionDatabase();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__questionDbInstance = questionDb;
}
