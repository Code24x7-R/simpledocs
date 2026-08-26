// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useState, useEffect } from 'react';

/**
 * Track PWA install availability.
 *
 * - `isInstalled`: true when running as an installed PWA (display-mode: standalone)
 *   or in a standalone-capable container.
 * - `canInstall`: true when the browser supports installation and the app is not
 *   yet installed (i.e. `beforeinstallprompt` fired).
 * - `promptInstall`: call this to trigger the browser's install dialog. Returns
 *   false if no prompt is available.
 */
export function useInstallPrompt(): {
  isInstalled: boolean;
  canInstall: boolean;
  promptInstall: () => Promise<boolean>;
} {
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  useEffect(() => {
    // Already running as an installed PWA?
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone);
    setIsInstalled(standalone);

    // Capture the install prompt so we can show it on demand.
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // If the user installs via our prompt, clean up.
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    // Cast: BeforeInstallPromptEvent has prompt() but isn't in lib.dom yet.
    const promptEvent = deferredPrompt as unknown as { prompt: () => void; userChoice: Promise<{ outcome: string }> };
    promptEvent.prompt();
    const result = await promptEvent.userChoice;
    if (result.outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstalled(true);
    }
    return result.outcome === 'accepted';
  };

  return {
    isInstalled,
    canInstall: !isInstalled && deferredPrompt !== null,
    promptInstall,
  };
}
