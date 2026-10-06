import React, { useState } from 'react';
import { useI18n } from '../../lib/i18n.tsx';
import { submitQuestion } from '../../lib/api-client.ts';
import { Question } from '../../types/question.ts';
import { Send, AlertCircle, Edit3, Trash2 } from 'lucide-react';

interface QuestionFormProps {
  initialQuestion?: string;
  onSuccess: (question: Question) => void;
  sessionId?: string;
  source?: 'qr' | 'direct' | 'session';
}

export const QuestionForm: React.FC<QuestionFormProps> = ({
  initialQuestion = '',
  onSuccess,
  sessionId = 'lecture-101',
  source = 'qr',
}) => {
  const { t, isRtl } = useI18n();

  const [questionText, setQuestionText] = useState(initialQuestion);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync when initialQuestion updates from SQAPS ai "Use This Question"
  React.useEffect(() => {
    if (initialQuestion) {
      setQuestionText(initialQuestion);
      setErrorMessage(null);
    }
  }, [initialQuestion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = questionText.trim();

    if (!cleanText) {
      setErrorMessage(t('questionRequiredError'));
      return;
    }

    if (cleanText.length < 5) {
      setErrorMessage(t('questionMinLengthError'));
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await submitQuestion({
        question: cleanText,
        sessionId,
        source,
      });

      if (response.success && response.question) {
        onSuccess(response.question);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error submitting question';
      if (msg.includes('Duplicate')) {
        setErrorMessage(t('duplicatePrevented'));
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setQuestionText('');
    setErrorMessage(null);
  };

  const maxChars = 2000;
  const charsCount = questionText.length;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-sm"
    >
      {/* Title & Clear Action */}
      <div className="flex items-center justify-between mb-3">
        <label
          htmlFor="question-textarea"
          className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-900"
        >
          <div className="h-2 w-2 rounded-full bg-[#c59b27]" />
          <span>{t('questionFieldTitle')}</span>
        </label>

        {questionText.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>مسح</span>
          </button>
        )}
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          id="question-textarea"
          rows={4}
          value={questionText}
          onChange={(e) => {
            setQuestionText(e.target.value);
            if (errorMessage) setErrorMessage(null);
          }}
          placeholder={t('questionPlaceholder')}
          maxLength={maxChars}
          disabled={isSubmitting}
          className="w-full rounded-xl border border-slate-300 bg-slate-50/60 p-3.5 sm:p-4 text-sm sm:text-base text-slate-900 placeholder-slate-400 focus:border-[#c59b27] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#c59b27] leading-relaxed resize-y disabled:opacity-50"
        />

        {/* Character count */}
        <div className="absolute bottom-3 end-3 text-[11px] font-mono tabular-nums text-slate-400 bg-white/90 border border-slate-200 px-2 py-0.5 rounded-md">
          {charsCount} / {maxChars}
        </div>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs sm:text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Submit Button */}
      <div className="mt-4">
        <button
          type="submit"
          disabled={isSubmitting || !questionText.trim()}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-[#0a1628] py-3.5 px-6 text-base font-bold text-[#e5c052] shadow-sm hover:bg-[#0f1f38] focus:outline-none focus:ring-2 focus:ring-[#c59b27] focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.99]"
        >
          {isSubmitting ? (
            <>
              <span className="h-5 w-5 border-2 border-[#e5c052] border-t-transparent rounded-full animate-spin"></span>
              <span>{t('sendingQuestion')}</span>
            </>
          ) : (
            <>
              <Send className={`h-5 w-5 ${isRtl ? 'rotate-180' : ''}`} />
              <span>{t('sendQuestion')}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
