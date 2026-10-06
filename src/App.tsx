/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { I18nProvider, useI18n } from './lib/i18n.tsx';
import { Header } from './components/layout/Header.tsx';
import { Footer } from './components/layout/Footer.tsx';
import { UserQuestionPortal } from './components/portal/UserQuestionPortal.tsx';
import { LecturerDashboard } from './components/dashboard/LecturerDashboard.tsx';
import { QRCodeModal } from './components/qr/QRCodeModal.tsx';

function AppContent() {
  const { isRtl } = useI18n();

  // Route support: if /dashboard is accessed, show dashboard; otherwise show Questions Page
  const [isDashboardRoute, setIsDashboardRoute] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname.toLowerCase().includes('/dashboard');
    }
    return false;
  });

  const [sessionId, setSessionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('session') || 'conference-2026';
    }
    return 'conference-2026';
  });

  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const sessionParam = params.get('session');
      if (sessionParam) setSessionId(sessionParam);
      setIsDashboardRoute(pathname.includes('/dashboard'));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <div className={`min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans ${isRtl ? 'rtl' : 'ltr'}`}>
      {/* Official SQAPS Conference Header */}
      <Header sessionId={sessionId} />

      {/* Main Questions Page */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-4 sm:py-6">
        {isDashboardRoute ? (
          <LecturerDashboard
            sessionId={sessionId}
            onOpenQR={() => setIsQRModalOpen(true)}
          />
        ) : (
          <UserQuestionPortal sessionId={sessionId} />
        )}
      </main>

      {/* Official SQAPS Conference Footer (matching user image) */}
      <Footer />

      {/* QR Modal if invoked */}
      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        defaultSessionId={sessionId}
      />
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}
