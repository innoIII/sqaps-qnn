import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useI18n } from '../../lib/i18n.tsx';
import {
  QrCode,
  Download,
  Copy,
  Check,
  Printer,
  X,
  ExternalLink,
  Sliders,
} from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSessionId?: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  defaultSessionId = 'lecture-101',
}) => {
  const { t, isRtl } = useI18n();

  const [sessionId, setSessionId] = useState(defaultSessionId);
  const [qrPngUrl, setQrPngUrl] = useState<string>('');
  const [qrSvgString, setQrSvgString] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Compute absolute URL
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ais-lecture.example.com';
  const targetUrl = `${origin}/ask?session=${encodeURIComponent(sessionId.trim() || 'default')}`;

  useEffect(() => {
    if (!isOpen) return;

    // Generate high-resolution PNG for preview and download
    QRCode.toDataURL(targetUrl, {
      width: 512,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setQrPngUrl(url))
      .catch((err) => console.error('QR toDataURL error:', err));

    // Generate clean vector SVG
    QRCode.toString(targetUrl, {
      type: 'svg',
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((svg) => setQrSvgString(svg))
      .catch((err) => console.error('QR toString error:', err));
  }, [isOpen, targetUrl]);

  if (!isOpen) return null;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownloadPNG = () => {
    if (!qrPngUrl) return;
    const link = document.createElement('a');
    link.download = `lecture-qr-${sessionId || 'ask'}.png`;
    link.href = qrPngUrl;
    link.click();
  };

  const handleDownloadSVG = () => {
    if (!qrSvgString) return;
    const blob = new Blob([qrSvgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `lecture-qr-${sessionId || 'ask'}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 end-4 text-neutral-400 hover:text-white p-2 rounded-lg hover:bg-neutral-800 transition-colors"
          title={t('close')}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Title & Description */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {t('qrModalTitle')}
            </h2>
            <p className="text-xs text-neutral-400">{t('qrModalDesc')}</p>
          </div>
        </div>

        {/* Session ID input */}
        <div className="mt-4 mb-4 p-3 rounded-xl border border-neutral-800 bg-neutral-950/70">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 mb-1.5">
            <Sliders className="h-3.5 w-3.5 text-emerald-400" />
            <span>{t('sessionConfigTitle')}</span>
          </label>
          <input
            type="text"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder={t('sessionPlaceholder')}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-white placeholder-neutral-500 font-mono focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* QR Code White Container for Printing & Projecting */}
        <div className="flex flex-col items-center justify-center rounded-xl bg-white p-6 shadow-inner my-4">
          {qrPngUrl ? (
            <img
              src={qrPngUrl}
              alt="Student Portal QR Code"
              className="h-56 w-56 sm:h-64 sm:w-64 object-contain"
            />
          ) : (
            <div className="h-64 w-64 flex items-center justify-center text-neutral-400 text-sm">
              Generating QR...
            </div>
          )}
          <div className="mt-3 text-center">
            <span className="text-xs font-bold text-neutral-900 block tracking-wide">
              {t('brandName')}
            </span>
            <span className="text-[11px] font-mono text-neutral-600 block mt-0.5">
              /ask?session={sessionId || 'default'}
            </span>
          </div>
        </div>

        {/* Target URL field & Copy button */}
        <div className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 mb-5">
          <span className="text-xs font-mono text-neutral-300 truncate flex-1">
            {targetUrl}
          </span>
          <button
            onClick={handleCopyUrl}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md bg-neutral-800 text-white hover:bg-neutral-700 transition-colors shrink-0"
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

        {/* Action Buttons: PNG, SVG, Print */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            onClick={handleDownloadPNG}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-700 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" />
            <span>{t('downloadPNG')}</span>
          </button>

          <button
            onClick={handleDownloadSVG}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-700 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-cyan-400" />
            <span>{t('downloadSVG')}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-700 transition-colors"
          >
            <Printer className="h-3.5 w-3.5 text-amber-400" />
            <span>{t('printQR')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
