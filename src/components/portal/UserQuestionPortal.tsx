import React, { useState, useRef } from 'react';
import { useI18n } from '../../lib/i18n.tsx';
import { AIChatbot } from '../chatbot/AIChatbot.tsx';
import { QuestionForm } from '../questions/QuestionForm.tsx';
import { QuestionSuccess } from '../questions/QuestionSuccess.tsx';
import { Question } from '../../types/question.ts';

interface UserQuestionPortalProps {
  sessionId?: string;
}

export const UserQuestionPortal: React.FC<UserQuestionPortalProps> = ({
  sessionId = 'lecture-101',
}) => {
  const { t, isRtl } = useI18n();

  const [formulatedQuestion, setFormulatedQuestion] = useState<string>('');
  const [submittedQuestion, setSubmittedQuestion] = useState<Question | null>(null);
  const questionFormRef = useRef<HTMLDivElement>(null);

  const handleUseQuestion = (text: string) => {
    setFormulatedQuestion(text);
    // Smooth scroll down to Question Form
    setTimeout(() => {
      questionFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleSuccess = (created: Question) => {
    setSubmittedQuestion(created);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setSubmittedQuestion(null);
    setFormulatedQuestion('');
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-4 sm:py-6 space-y-6">
      {submittedQuestion ? (
        <QuestionSuccess question={submittedQuestion} onReset={handleReset} />
      ) : (
        <>
          {/* Section 1: SQAPS ai Assistant */}
          <div className="space-y-2">
            <AIChatbot onUseQuestion={handleUseQuestion} sessionId={sessionId} />
          </div>

          {/* Section 2: Question Field & Submission */}
          <div ref={questionFormRef} className="space-y-2">
            <QuestionForm
              initialQuestion={formulatedQuestion}
              onSuccess={handleSuccess}
              sessionId={sessionId}
              source="qr"
            />
          </div>
        </>
      )}
    </div>
  );
};
