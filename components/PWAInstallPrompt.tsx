'use client';
import { useEffect, useState } from 'react';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const shown = localStorage.getItem('pwa-prompt-shown');
      if (!shown) {
        setTimeout(() => setShowPrompt(true), 30000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-shown', 'true');
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-shown', 'true');
  };

  if (!showPrompt || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-sm z-50 bg-surface border border-border rounded-xl p-4 shadow-pop animate-slideUp">
      <p className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-text-tertiary mb-2">
        INSTALL
      </p>
      <p className="text-sm text-text-primary mb-3">
        Install Personal OS for quick access from your home screen.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleInstall}
          className="flex-1 bg-accent text-page text-sm font-medium rounded-lg py-2 hover:bg-accent-hover transition"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="px-4 text-sm text-text-secondary hover:text-text-primary transition"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
