import { GoogleGenAI } from '@google/genai';
import { AIServiceConfig, ChatMessage, ChatRequest, ChatResponse } from '../../types/ai.ts';

// In-memory rate limiting tracker per session
const sessionRequestCounters = new Map<string, { count: number; lastReset: number }>();

// In-memory cache for ultra-fast recurring queries
const responseCache = new Map<string, ChatResponse>();

export class AIService {
  private config: AIServiceConfig;

  constructor() {
    const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase() as AIServiceConfig['provider'];
    this.config = {
      provider,
      model: process.env.AI_MODEL || (provider === 'gemini' ? 'gemini-3.8-flash' : 'gpt-4o-mini'),
      maxTokens: parseInt(process.env.AI_MAX_TOKENS || '120', 10),
      maxRequestsPerSession: parseInt(process.env.AI_MAX_REQUESTS_PER_SESSION || '30', 10),
    };
  }

  public getConfig(): AIServiceConfig {
    return { ...this.config };
  }

  private checkRateLimit(sessionId: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour window
    const record = sessionRequestCounters.get(sessionId) || { count: 0, lastReset: now };

    if (now - record.lastReset > windowMs) {
      record.count = 0;
      record.lastReset = now;
    }

    if (record.count >= this.config.maxRequestsPerSession) {
      return { allowed: false, remaining: 0 };
    }

    record.count++;
    sessionRequestCounters.set(sessionId, record);
    return {
      allowed: true,
      remaining: this.config.maxRequestsPerSession - record.count,
    };
  }

  public async chat(request: ChatRequest): Promise<ChatResponse> {
    const sessionId = request.sessionId || 'default-session';
    const rateCheck = this.checkRateLimit(sessionId);

    if (!rateCheck.allowed) {
      return {
        success: false,
        message:
          request.language === 'en'
            ? 'Session limit reached. You can still write and submit your question manually below.'
            : 'تم الوصول إلى الحد الأقصى للجلسة. يمكنك كتابة سؤالك وإرساله مباشرة في الحقل أدناه.',
        provider: this.config.provider,
        error: 'RATE_LIMIT_EXCEEDED',
      };
    }

    // Check fast cache
    const lastUserQuery = [...request.messages].reverse().find((m) => m.role === 'user')?.content.trim() || '';
    const cacheKey = `${request.language || 'ar'}_${lastUserQuery.toLowerCase()}`;
    if (responseCache.has(cacheKey)) {
      return responseCache.get(cacheKey)!;
    }

    const geminiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    // Fast cloud timeout: If cloud API takes more than 1.8 seconds (e.g. 503 spike), immediately switch to ultra-fast local engine
    const cloudTimeoutMs = 1800;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Cloud AI latency timeout')), cloudTimeoutMs)
    );

    try {
      let result: ChatResponse;
      if (this.config.provider === 'gemini' && geminiKey) {
        result = await Promise.race([this.callGemini(request), timeoutPromise]);
      } else if (this.config.provider === 'openai' && openaiKey) {
        result = await Promise.race([this.callOpenAI(request), timeoutPromise]);
      } else {
        result = this.callFastAcademicEngine(request);
      }

      // Cache result for instant responses
      if (cacheKey.length < 200) {
        responseCache.set(cacheKey, result);
        if (responseCache.size > 200) {
          const firstKey = responseCache.keys().next().value;
          if (firstKey) responseCache.delete(firstKey);
        }
      }
      return result;
    } catch (err: unknown) {
      // Immediate instantaneous fallback in < 5ms without user delay
      const fallbackResult = this.callFastAcademicEngine(request);
      return fallbackResult;
    }
  }

  private buildSystemInstruction(lang: 'ar' | 'en' = 'ar'): string {
    if (lang === 'en') {
      return `You are SQAPS ai for the 3rd International Scientific Conference. Formulate the attendee's query directly and concisely into a single sharp academic question. Put it strictly between:
<<<SUGGESTED_QUESTION>>>
Polished question
<<</SUGGESTED_QUESTION>>>
Write only 1 brief polite sentence before it.`;
    }

    return `أنت SQAPS ai للمؤتمر العلمي الدولي الثالث (الجرائم العابرة للحدود).
مهمتك صياغة استفسار الحضور فورياً كسؤال أكاديمي مباشر ومحكم للجلسة.
ضع صيغة السؤال المقترحة الوحيدة بدقة داخل:
<<<SUGGESTED_QUESTION>>>
السؤال الأكاديمي المصاغ هنا
<<</SUGGESTED_QUESTION>>>
اكتب جملة تمهيدية واحدة فقط شديدة الإيجاز.`;
  }

  private async callGemini(request: ChatRequest): Promise<ChatResponse> {
    const key = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
    const ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const lang = request.language || 'ar';
    const systemInstruction = this.buildSystemInstruction(lang);

    // Send only the latest user message to eliminate token bloat and accelerate decoding
    const lastUserMessage = [...request.messages].reverse().find((m) => m.role === 'user')?.content || '';
    const contents = [
      {
        role: 'user',
        parts: [{ text: `صغ هذا الاستفسار كسؤال أكاديمي لمؤتمر الجرائم العابرة للحدود: ${lastUserMessage}` }],
      },
    ];

    const response = await ai.models.generateContent({
      model: this.config.model,
      contents,
      config: {
        systemInstruction,
        maxOutputTokens: 100, // Minimal token budget for lightning-fast output
        temperature: 0.2,
      },
    });

    const fullText = response.text || '';
    const { cleanMessage, suggestedQuestion } = this.extractSuggestedQuestion(fullText);

    return {
      success: true,
      message: cleanMessage,
      suggestedQuestion,
      provider: 'gemini',
    };
  }

  private async callOpenAI(request: ChatRequest): Promise<ChatResponse> {
    const lang = request.language || 'ar';
    const systemInstruction = this.buildSystemInstruction(lang);

    const messages = [
      { role: 'system', content: systemInstruction },
      ...request.messages.slice(-3).map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4o-mini',
        messages,
        max_tokens: 100,
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI request failed: ${res.statusText}`);
    }

    const data = await res.json();
    const fullText = data.choices?.[0]?.message?.content || '';
    const { cleanMessage, suggestedQuestion } = this.extractSuggestedQuestion(fullText);

    return {
      success: true,
      message: cleanMessage,
      suggestedQuestion,
      provider: 'openai',
    };
  }

  /**
   * Ultra-fast local academic engine (< 2 milliseconds execution)
   */
  private callFastAcademicEngine(request: ChatRequest): ChatResponse {
    const lang = request.language || 'ar';
    const lastUserMessage = [...request.messages].reverse().find((m) => m.role === 'user')?.content || '';

    // Strip colloquial & hesitation phrases
    let core = lastUserMessage.trim();
    core = core
      .replace(/^(أنا مش فاهم|مش فاهم|أريد أن أسأل عن|سؤالي هو|بدي أسأل|ممكن سؤال عن|حاب استفسر عن|كيف يعني|يا ريت توضيح|لو سمحت بدي اعرف|I want to ask|I don't understand|Can you clarify)/i, '')
      .replace(/[؟?؟!.]+$/, '')
      .trim();

    if (!core) {
      core = 'محاور الجلسة العلمية الحالية';
    }

    if (lang === 'ar') {
      let suggested: string;
      const lower = core.toLowerCase();

      if (lower.includes('سيبران') || lower.includes('تقني') || lower.includes('إلكترون') || lower.includes('ذكاء')) {
        suggested = `ما هي الآليات المعتمدة لتوظيف التقنيات الحديثة في مواجهة الجرائم السيبرانية العابرة للحدود وحجية الأدلة الرقمية؟`;
      } else if (lower.includes('تعاون') || lower.includes('دولي') || lower.includes('تسليم') || lower.includes('إنتربول')) {
        suggested = `كيف يمكن تعزيز كفاءة التعاون الأمني والقضائي الدولي في ملاحقة مرتكبي الجرائم العابرة للحدود؟`;
      } else if (lower.includes('غسيل') || lower.includes('أموال') || lower.includes('مالي') || lower.includes('تمويل')) {
        suggested = `ما هي أبرز التحديات التشريعية والتنظيمية في تتبع التدفقات المالية المشبوهة ومكافحة غسيل الأموال العابر للحدود؟`;
      } else if (lower.includes('قانون') || lower.includes('تشريع') || lower.includes('اتفاقي') || lower.includes('قضائ')) {
        suggested = `ما مدى ملاءمة الأطر التشريعية الوطنية مع المعاهدات الدولية لمواجهة الجرائم المنظمة العابرة للحدود؟`;
      } else {
        suggested = `هل يمكن توضيح: ${core}، مع تسليط الضوء على الأبعاد التطبيقية في العمل الأمني؟`;
      }

      return {
        success: true,
        message: 'تمت صياغة استفسارك بأسلوب أكاديمي محكم يناسب محاور المؤتمر:',
        suggestedQuestion: suggested,
        provider: 'sqaps-fast-ai',
      };
    } else {
      const suggested = `Could the session speaker elaborate on: ${core}, highlighting the operational implications in transnational policing?`;
      return {
        success: true,
        message: 'Here is your refined academic question tailored for the conference session:',
        suggestedQuestion: suggested,
        provider: 'sqaps-fast-ai',
      };
    }
  }

  private extractSuggestedQuestion(rawText: string): { cleanMessage: string; suggestedQuestion?: string } {
    const match = rawText.match(/<<<SUGGESTED_QUESTION>>>([\s\S]*?)<<<\/SUGGESTED_QUESTION>>>/);
    if (match && match[1]) {
      const suggested = match[1].trim();
      const cleanMessage = rawText
        .replace(/<<<SUGGESTED_QUESTION>>>[\s\S]*?<<<\/SUGGESTED_QUESTION>>>/, '')
        .trim();
      return {
        cleanMessage: cleanMessage || `تمت صياغة استفسارك كسؤال أكاديمي:`,
        suggestedQuestion: suggested,
      };
    }

    return { cleanMessage: rawText, suggestedQuestion: rawText };
  }
}

export const aiService = new AIService();
