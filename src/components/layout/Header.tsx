import React from 'react';
import { useI18n } from '../../lib/i18n.tsx';
import { Globe, HelpCircle, Shield } from 'lucide-react';

interface HeaderProps {
  sessionId?: string;
  totalQuestions?: number;
}

export const Header: React.FC<HeaderProps> = ({ sessionId = 'lecture-101', totalQuestions = 0 }) => {
  const { t, lang, toggleLang, isRtl } = useI18n();

  return (
    <header className="w-full bg-[#0a1628] text-white border-b border-[#1a2b47] relative overflow-hidden shadow-md">
      {/* Subtle Geometric Background Pattern */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#c59b27 1px, transparent 1px), radial-gradient(#c59b27 1px, #0a1628 1px)`,
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0, 12px 12px',
        }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-6 relative z-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Conference Title Lockup (Pure Typographic Design) */}
          <div className="space-y-1 text-center sm:text-start">
            <span className="text-xs sm:text-sm font-bold text-[#e5c052] tracking-wide block">
              {t('brandName')}
            </span>
            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
              <h1 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight">
                {t('conferenceTitle')}
              </h1>
              <span className="text-[#c59b27] font-bold text-sm hidden xs:inline">·</span>
              <span className="text-sm sm:text-base font-bold text-slate-200">
                {t('conferenceSubtitle')}
              </span>
            </div>
          </div>

          {/* Right Area: Audience Questions Pill (Image 4 style) & Language Switcher */}
          <div className="flex items-center gap-3">
            {/* Floating Audience Questions Pill matching Image 4 */}
            <div className="flex items-center gap-2 rounded-full border border-[#c59b27] bg-[#0c1a30] py-1.5 px-3.5 shadow-md">
              <HelpCircle className="h-4 w-4 text-[#e5c052]" />
              <span className="text-xs font-bold text-[#e5c052]">
                أسئلة الحضور
              </span>
            </div>

            {/* Language Switcher */}
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/80 py-1.5 px-2.5 text-xs font-semibold text-slate-200 hover:text-white hover:border-[#c59b27] transition-colors"
              title="تغيير اللغة / Switch Language"
            >
              <Globe className="h-3.5 w-3.5 text-[#e5c052]" />
              <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Thin Gold accent bottom border */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#c59b27] to-transparent opacity-80" />
    </header>
  );
};
