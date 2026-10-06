import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useI18n } from '../../lib/i18n.tsx';
import {
  QrCode,
  Download,
  Copy,
  Check,
  Printer,
  ExternalLink,
  Sliders,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

interface QRCodePageProps {
  sessionId?: string;
  onNavigateToPortal: () => void;
  onNavigateToDashboard: () => void;
}

export const QRCodePage: React.FC<QRCodePageProps> = ({
  sessionId: initialSessionId = 'lecture-101',
  onNavigateToPortal,
  onNavigateToDashboard,
}) => {
  const { t, isRtl } = useI18n();

  const [sessionId, setSessionId] = useState(initialSessionId);
  const [qrPngUrl, setQrPngUrl] = useState<string>('');
  const [qrSvgString, setQrSvgString] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ais-lecture.example.com';
  const targetUrl = `${origin}/ask?session=${encodeURIComponent(sessionId.trim() || 'default')}`;

  useEffect(() => {
    QRCode.toDataURL(targetUrl, {
      width: 700,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setQrPngUrl(url))
      .catch((err) => console.error(err));

    QRCode.toString(targetUrl, {
      type: 'svg',
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((svg) => setQrSvgString(svg))
      .catch((err) => console.error(err));
  }, [targetUrl]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDownloadPNG = () => {
    if (!qrPngUrl) return;
    const link = document.createElement('a');
    link.download = `lecture-qr-${sessionId}.png`;
    link.href = qrPngUrl;
    link.click();
  };

  const handleDownloadSVG = () => {
    if (!qrSvgString) return;
    const blob = new Blob([qrSvgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `lecture-qr-${sessionId}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12 space-y-8">
      {/* Title */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-1">
          <QrCode className="h-3.5 w-3.5" />
          <span>{t('viewQRDisplay')}</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
          {t('qrModalTitle')}
        </h1>
        <p className="text-sm sm:text-base text-neutral-400 max-w-xl mx-auto">
          {t('qrModalDesc')}
        </p>
      </div>

      {/* Main Projector Card */}
      <div className="flex flex-col md:flex-row items-center gap-8 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6 sm:p-10 shadow-2xl backdrop-blur-md">
        {/* Left: High-Contrast White QR Box for Projector */}
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-6 sm:p-8 shadow-2xl shrink-0">
          {qrPngUrl ? (
            <img
              src={qrPngUrl}
              alt="QR Code"
              className="h-64 w-64 sm:h-72 sm:w-72 object-contain"
            />
          ) : (
            <div className="h-72 w-72 flex items-center justify-center text-neutral-500">
              Generating...
            </div>
          )}
          <div className="mt-4 text-center">
            <span className="text-sm font-bold text-neutral-900 block">
              {t('brandName')}
            </span>
            <span className="text-xs font-mono text-neutral-600 block mt-0.5">
              {targetUrl}
            </span>
          </div>
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex-1 space-y-5 w-full">
          {/* Session code modifier */}
          <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/70 space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
              <Sliders className="h-4 w-4 text-emerald-400" />
              <span>{t('sessionConfigTitle')}</span>
            </label>
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder={t('sessionPlaceholder')}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2 text-sm text-white font-mono placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Target link with copy */}
          <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 p-3">
            <span className="text-xs font-mono text-neutral-300 truncate flex-1">
              {targetUrl}
            </span>
            <button
              onClick={handleCopyUrl}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-neutral-800 text-white hover:bg-neutral-700 transition-colors shrink-0"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">{t('copiedUrl')}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>{t('copyUrl')}</span>
                </>
              )}
            </button>
          </div>

          {/* Action buttons: PNG, SVG, Print */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              onClick={handleDownloadPNG}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 py-2.5 px-3 text-xs font-semibold text-white hover:bg-neutral-700 transition-colors"
            >
              <Download className="h-4 w-4 text-emerald-400" />
              <span>{t('downloadPNG')}</span>
            </button>

            <button
              onClick={handleDownloadSVG}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 py-2.5 px-3 text-xs font-semibold text-white hover:bg-neutral-700 transition-colors"
            >
              <Download className="h-4 w-4 text-cyan-400" />
              <span>{t('downloadSVG')}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 py-2.5 px-3 text-xs font-semibold text-white hover:bg-neutral-700 transition-colors"
            >
              <Printer className="h-4 w-4 text-amber-400" />
              <span>{t('printQR')}</span>
            </button>
          </div>

          {/* Navigation helpers */}
          <div className="pt-4 border-t border-neutral-800 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onNavigateToPortal}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 py-2.5 px-4 text-xs font-semibold hover:bg-emerald-500 hover:text-black transition-colors"
            >
              <span>{t('viewUserPortal')}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={onNavigateToDashboard}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 py-2.5 px-4 text-xs font-semibold hover:bg-cyan-500 hover:text-black transition-colors"
            >
              <span>{t('viewLecturerDashboard')}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
