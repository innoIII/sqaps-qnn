import React from 'react';
import { useI18n } from '../../lib/i18n.tsx';
import { Globe, Mail, Phone } from 'lucide-react';

export const Footer: React.FC = () => {
  const { t, isRtl } = useI18n();

  return (
    <footer className="w-full bg-white border-t border-slate-200 relative mt-12">
      {/* Top Gold Accent Line (as in the image) */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[#b38728] via-[#e5c052] to-[#b38728]" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Title: تواصل معنا */}
        <div className="mb-4">
          <h4 className="text-base font-extrabold text-slate-900 tracking-normal">
            {t('contactUs')}
          </h4>
        </div>

        {/* 3 Contact Cards (Matching Image 1) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          {/* Card 1: Official Website */}
          <a
            href="https://sqaps.edu.om"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200 hover:border-amber-400/50 hover:bg-white transition-all shadow-sm group"
          >
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-slate-500 block">
                {t('officialWebsite')}
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#0c192e] block tracking-wide group-hover:text-[#b38728] transition-colors">
                sqaps.edu.om
              </span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-[#0c192e] flex items-center justify-center text-[#d4af37] shadow-sm shrink-0">
              <Globe className="h-5 w-5" />
            </div>
          </a>

          {/* Card 2: Email */}
          <a
            href="mailto:info@rop.gov.om"
            className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200 hover:border-amber-400/50 hover:bg-white transition-all shadow-sm group"
          >
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-slate-500 block">
                {t('email')}
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#0c192e] block tracking-wide group-hover:text-[#b38728] transition-colors">
                info@rop.gov.om
              </span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-[#0c192e] flex items-center justify-center text-[#d4af37] shadow-sm shrink-0">
              <Mail className="h-5 w-5" />
            </div>
          </a>

          {/* Card 3: Phone */}
          <div className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200 hover:border-amber-400/50 hover:bg-white transition-all shadow-sm group">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-slate-500 block">
                {t('phone')}
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#0c192e] block tracking-wide font-mono tabular-nums">
                25656565 - 25459825
              </span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-[#0c192e] flex items-center justify-center text-[#d4af37] shadow-sm shrink-0">
              <Phone className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200 mt-6 pt-5 text-center">
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
            {t('footerCopyright')}
          </p>
        </div>
      </div>
    </footer>
  );
};
