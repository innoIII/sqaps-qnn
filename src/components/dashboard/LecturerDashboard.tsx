import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../../lib/i18n.tsx';
import {
  fetchQuestions,
  updateQuestion,
  deleteQuestion,
  subscribeQuestionsStream,
  StreamEvent,
} from '../../lib/api-client.ts';
import { Question, QuestionStats, QuestionStatus } from '../../types/question.ts';
import {
  CheckCircle,
  Clock,
  Search,
  Filter,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  QrCode,
  RefreshCw,
  Trash2,
  MessageSquare,
  Radio,
  Sparkles,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react';

interface LecturerDashboardProps {
  sessionId?: string;
  onOpenQR: () => void;
}

export const LecturerDashboard: React.FC<LecturerDashboardProps> = ({
  sessionId = 'lecture-101',
  onOpenQR,
}) => {
  const { t, lang, isRtl } = useI18n();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [stats, setStats] = useState<QuestionStats>({
    total: 0,
    unanswered: 0,
    answered: 0,
    archived: 0,
    latestCreatedAt: null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'NEW' | 'ANSWERED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isProjectorMode, setIsProjectorMode] = useState(false);
  const [newQuestionIds, setNewQuestionIds] = useState<Set<string>>(new Set());
  const [liveStatus, setLiveStatus] = useState<'connected' | 'reconnecting'>('connected');

  // Web Audio synthesizer chime for incoming questions
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Audio might be blocked if user hasn't interacted
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await fetchQuestions({ sessionId });
      setQuestions(data.questions);
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to SSE real-time stream
    const unsubscribe = subscribeQuestionsStream(
      (event: StreamEvent) => {
        setLiveStatus('connected');

        if (event.type === 'NEW_QUESTION' && event.question) {
          const newQ = event.question;
          setQuestions((prev) => {
            // Avoid duplicates
            if (prev.some((q) => q.id === newQ.id)) return prev;
            return [newQ, ...prev];
          });

          // Highlight newly arrived question
          setNewQuestionIds((prev) => new Set(prev).add(newQ.id));
          playChime();

          // Remove highlight after 6 seconds
          setTimeout(() => {
            setNewQuestionIds((prev) => {
              const next = new Set(prev);
              next.delete(newQ.id);
              return next;
            });
          }, 6000);
        } else if (event.type === 'UPDATE_QUESTION' && event.question) {
          const updated = event.question;
          setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
        } else if (event.type === 'DELETE_QUESTION' && event.questionId) {
          setQuestions((prev) => prev.filter((q) => q.id !== event.questionId));
        }

        if (event.stats) {
          setStats(event.stats);
        }
      },
      () => {
        setLiveStatus('reconnecting');
      }
    );

    return () => {
      unsubscribe();
    };
  }, [sessionId, soundEnabled]);

  const handleToggleAnswered = async (question: Question) => {
    const nextStatus: QuestionStatus = question.status === 'ANSWERED' ? 'NEW' : 'ANSWERED';
    try {
      // Optimistic update
      setQuestions((prev) =>
        prev.map((q) => (q.id === question.id ? { ...q, status: nextStatus } : q))
      );
      setStats((prev) => ({
        ...prev,
        answered: nextStatus === 'ANSWERED' ? prev.answered + 1 : prev.answered - 1,
        unanswered: nextStatus === 'ANSWERED' ? prev.unanswered - 1 : prev.unanswered + 1,
      }));

      await updateQuestion(question.id, { status: nextStatus });
    } catch (err) {
      console.error('Failed to update question status:', err);
      loadData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirmDelete'))) return;
    try {
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      await deleteQuestion(id);
    } catch (err) {
      console.error('Failed to delete question:', err);
      loadData();
    }
  };

  // Filtered and searched questions
  const filteredQuestions = questions.filter((q) => {
    if (activeFilter === 'NEW' && q.status !== 'NEW') return false;
    if (activeFilter === 'ANSWERED' && q.status !== 'ANSWERED') return false;
    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase().trim();
      return q.question.toLowerCase().includes(term);
    }
    return true;
  });

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return t('noLatestTime');
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`w-full ${isProjectorMode ? 'fixed inset-0 z-50 bg-black text-white p-6 overflow-y-auto' : 'space-y-6'}`}>
      {/* Top Header & Live Stream Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {t('dashboardTitle')}
            </h1>

            {/* SSE Live status indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-950/60 border border-emerald-800/60 text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>{t('liveConnected')}</span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            {t('dashboardSubtitle')}
          </p>
        </div>

        {/* Dashboard Tools */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Sound Alert Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              soundEnabled
                ? 'bg-neutral-900 border-neutral-700 text-emerald-400'
                : 'bg-neutral-950 border-neutral-800 text-neutral-500'
            }`}
            title={soundEnabled ? t('soundAlertOn') : t('soundAlertOff')}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span className="hidden md:inline">{soundEnabled ? t('soundAlertOn') : t('soundAlertOff')}</span>
          </button>

          {/* QR Modal Trigger */}
          <button
            onClick={onOpenQR}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold transition-colors"
          >
            <QrCode className="h-4 w-4" />
            <span>{t('openQRModal')}</span>
          </button>

          {/* Projector Fullscreen View */}
          <button
            onClick={() => setIsProjectorMode(!isProjectorMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              isProjectorMode
                ? 'bg-cyan-500 text-black border-cyan-400'
                : 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:text-white'
            }`}
          >
            {isProjectorMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            <span className="hidden sm:inline">
              {isProjectorMode ? t('exitProjector') : t('projectorMode')}
            </span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1 p-2 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white transition-colors"
            title={t('refreshData')}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Cards (Single Elevation, Tabular Numerals) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Questions */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 backdrop-blur-sm">
          <span className="text-xs font-medium text-neutral-400 block mb-1">
            {t('statsTotal')}
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-white">
            {stats.total}
          </div>
        </div>

        {/* Unanswered (New) */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 backdrop-blur-sm">
          <span className="text-xs font-medium text-amber-400 block mb-1">
            {t('statsUnanswered')}
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-amber-300">
            {stats.unanswered}
          </div>
        </div>

        {/* Answered */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 backdrop-blur-sm">
          <span className="text-xs font-medium text-emerald-400 block mb-1">
            {t('statsAnswered')}
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-emerald-400">
            {stats.answered}
          </div>
        </div>

        {/* Latest Time */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 backdrop-blur-sm">
          <span className="text-xs font-medium text-neutral-400 block mb-1">
            {t('statsLatestTime')}
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-neutral-200 truncate">
            {formatTime(stats.latestCreatedAt)}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Segmented Filter Buttons */}
        <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg border border-neutral-800 shrink-0">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeFilter === 'ALL'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {t('filterAll')} ({stats.total})
          </button>
          <button
            onClick={() => setActiveFilter('NEW')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeFilter === 'NEW'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {t('filterNew')} ({stats.unanswered})
          </button>
          <button
            onClick={() => setActiveFilter('ANSWERED')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeFilter === 'ANSWERED'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {t('filterAnswered')} ({stats.answered})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className={`absolute top-2.5 ${isRtl ? 'right-3' : 'left-3'} h-4 w-4 text-neutral-500`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className={`w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2 ${
              isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'
            } text-xs sm:text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none`}
          />
        </div>
      </div>

      {/* Questions Feed / List */}
      <div className="space-y-3">
        {filteredQuestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900/40 p-10 sm:p-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-800/80 text-neutral-500 mb-3">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">
              {searchQuery ? t('emptyFilterResults') : t('emptyQuestionsTitle')}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-md">
              {t('emptyQuestionsDesc')}
            </p>
          </div>
        ) : (
          filteredQuestions.map((q) => {
            const isJustArrived = newQuestionIds.has(q.id);
            const isAnswered = q.status === 'ANSWERED';

            return (
              <div
                key={q.id}
                className={`group rounded-xl border p-4 sm:p-5 transition-all duration-300 ${
                  isJustArrived
                    ? 'border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-500/10'
                    : isAnswered
                    ? 'border-neutral-800/80 bg-neutral-950/60 opacity-80'
                    : 'border-neutral-800 bg-neutral-900/70 hover:border-neutral-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* Question Content & Metadata */}
                  <div className="space-y-2 flex-1">
                    {/* Clean unboxed metadata with dot separators */}
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <span className="font-mono tabular-nums text-neutral-300">
                        {formatTime(q.createdAt)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-neutral-400">
                        {q.source === 'qr' ? t('sourceQR') : t('sourceDirect')}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`text-xs font-semibold ${
                          isAnswered ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {isAnswered ? t('questionAnsweredBadge') : t('questionNewBadge')}
                      </span>
                    </div>

                    {/* Question text (High contrast, scalable for projector) */}
                    <p
                      className={`font-medium leading-relaxed whitespace-pre-line ${
                        isProjectorMode ? 'text-xl sm:text-2xl text-white' : 'text-sm sm:text-base text-neutral-100'
                      }`}
                    >
                      {q.question}
                    </p>
                  </div>

                  {/* Question Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                    <button
                      onClick={() => handleToggleAnswered(q)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        isAnswered
                          ? 'border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                          : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-md shadow-emerald-500/10'
                      }`}
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>{isAnswered ? t('markAsNew') : t('markAsAnswered')}</span>
                    </button>

                    <button
                      onClick={() => handleDelete(q.id)}
                      className="p-1.5 text-neutral-500 hover:text-red-400 rounded-lg hover:bg-neutral-800 transition-colors"
                      title={t('deleteQuestion')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
