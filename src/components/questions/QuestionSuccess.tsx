import React from 'react';
import { useI18n } from '../../lib/i18n.tsx';
import { Question } from '../../types/question.ts';
import { CheckCircle2, MessageSquarePlus } from 'lucide-react';

interface QuestionSuccessProps {
  question: Question;
  onReset: () => void;
}

export const QuestionSuccess: React.FC<QuestionSuccessProps> = ({ question, onReset }) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center text-center rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm animate-in fade-in zoom-in-95 duration-200">
      {/* Success Badge Icon in Navy and Gold */}
      <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-[#0a1628] border-2 border-[#c59b27] text-[#e5c052] mb-5 shadow-md">
        <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12" />
      </div>

      {/* Main Title: تم إرسال سؤالك بنجاح */}
      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6 tracking-tight">
        {t('successTitle')}
      </h2>

      {/* Submitted Question Text Preview (without ID or extra notes) */}
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-slate-50 p-4 text-start mb-6">
        <p className="text-sm sm:text-base text-slate-800 font-semibold leading-relaxed whitespace-pre-line">
          {question.question}
        </p>
      </div>

      {/* Ask Another Question Button */}
      <button
        onClick={onReset}
        className="flex items-center justify-center gap-2 rounded-xl bg-[#0a1628] py-3.5 px-6 text-sm sm:text-base font-bold text-[#e5c052] hover:bg-[#0f1f38] transition-colors focus:outline-none focus:ring-2 focus:ring-[#c59b27]"
      >
        <MessageSquarePlus className="h-5 w-5" />
        <span>{t('askAnotherQuestion')}</span>
      </button>
    </div>
  );
};
