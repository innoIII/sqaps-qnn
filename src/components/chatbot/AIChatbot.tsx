import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '../../lib/i18n.tsx';
import { sendAIChat } from '../../lib/api-client.ts';
import { ChatMessage } from '../../types/ai.ts';
import {
  Sparkles,
  Send,
  CornerDownLeft,
  RotateCcw,
  Check,
  AlertCircle,
  Lightbulb,
  Bot,
  User,
} from 'lucide-react';

interface AIChatbotProps {
  onUseQuestion: (questionText: string) => void;
  sessionId?: string;
}

export const AIChatbot: React.FC<AIChatbotProps> = ({ onUseQuestion, sessionId = 'lecture-101' }) => {
  const { t, lang, isRtl } = useI18n();

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      role: 'assistant',
      content: t('aiInitialMessage'),
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    setErrorNotice(null);
    const userMsg: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendAIChat({
        messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
        sessionId,
        language: lang,
      });

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: response.message,
        suggestedQuestion: response.suggestedQuestion,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      console.error('Chat error:', err);
      setErrorNotice(t('aiUnavailableNotice'));
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: t('aiUnavailableNotice'),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseQuestion = (suggested: string, msgIndex: number) => {
    onUseQuestion(suggested);
    setCopiedId(`msg-${msgIndex}`);
    setTimeout(() => {
      setCopiedId(null);
    }, 2500);
  };

  const handleReset = () => {
    setMessages([
      {
        role: 'assistant',
        content: t('aiInitialMessage'),
      },
    ]);
    setErrorNotice(null);
  };

  const quickPrompts = [
    t('aiQuickPrompt1'),
    t('aiQuickPrompt2'),
    t('aiQuickPrompt3'),
  ];

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      {/* SQAPS ai Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-[#0a1628] text-white">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#c59b27]/20 border border-[#c59b27]/40 text-[#e5c052]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              {t('aiAssistantName')}
            </h3>
            <span className="text-[11px] text-slate-300">
              {t('aiBadge')} · <span className="text-[#e5c052] font-semibold">المؤتمر العلمي</span>
            </span>
          </div>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-1 text-xs text-slate-300 hover:text-white transition-colors px-2 py-1 rounded hover:bg-slate-800"
          title={t('aiResetChat')}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('aiResetChat')}</span>
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-4 space-y-3.5 max-h-[340px] sm:max-h-[380px] overflow-y-auto bg-slate-50/50">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={index}
              className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs shadow-sm ${
                  isUser
                    ? 'bg-[#0a1628] text-white'
                    : 'bg-[#0a1628] text-[#e5c052] border border-[#c59b27]/40'
                }`}
              >
                {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>

              {/* Message Bubble */}
              <div className="flex flex-col max-w-[85%] sm:max-w-[80%]">
                <div
                  className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-[#0a1628] text-white rounded-br-none shadow-sm'
                      : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>

                  {/* Formulated Question Callout & Action */}
                  {msg.suggestedQuestion && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <div className="text-[11px] font-bold text-[#b38728] mb-1.5 flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>{t('aiSuggestedLabel')}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-amber-300/60 text-slate-900 font-semibold text-xs sm:text-sm leading-relaxed mb-2.5">
                        {msg.suggestedQuestion}
                      </div>

                      <button
                        onClick={() => handleUseQuestion(msg.suggestedQuestion!, index)}
                        className={`w-full flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm ${
                          copiedId === `msg-${index}`
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[#c59b27] text-[#0a1628] hover:bg-[#d4af37]'
                        }`}
                      >
                        {copiedId === `msg-${index}` ? (
                          <>
                            <Check className="h-4 w-4" />
                            <span>{t('aiCopiedToast')}</span>
                          </>
                        ) : (
                          <>
                            <CornerDownLeft className="h-4 w-4" />
                            <span>{t('aiUseThisQuestion')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-2.5 items-center">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#c59b27] text-white">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="rounded-2xl rounded-bl-none bg-white border border-slate-200 px-3.5 py-2 text-xs text-slate-500 flex items-center gap-2 shadow-sm">
              <span className="flex gap-1 items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-[#c59b27] animate-bounce"></span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#c59b27] animate-bounce [animation-delay:0.2s]"></span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#c59b27] animate-bounce [animation-delay:0.4s]"></span>
              </span>
              <span>{t('aiThinking')}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick starter prompts */}
      {messages.length <= 2 && (
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100">
          <div className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
            <Lightbulb className="h-3.5 w-3.5 text-[#c59b27]" />
            <span>{t('aiQuickPromptsTitle')}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((promptText, i) => (
              <button
                key={i}
                onClick={() => handleSend(promptText)}
                className="text-[11px] text-slate-700 bg-white hover:bg-slate-100 hover:text-slate-900 border border-slate-200 rounded-lg px-2.5 py-1 text-start transition-colors"
              >
                {promptText}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error Notice */}
      {errorNotice && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 flex items-center gap-2 text-xs text-amber-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t border-slate-200 bg-white flex gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('aiPlaceholder')}
          disabled={isLoading}
          className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-[#c59b27] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#c59b27] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-[#0a1628] px-4 py-2.5 text-xs sm:text-sm font-bold text-[#e5c052] hover:bg-[#0f1f38] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          <Send className={`h-4 w-4 ${isRtl ? 'rotate-180' : ''}`} />
          <span className="hidden sm:inline">{t('aiSend')}</span>
        </button>
      </form>
    </div>
  );
};
