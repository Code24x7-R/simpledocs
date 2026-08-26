// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInstallPrompt } from './useInstallPrompt';

describe('useInstallPrompt', () => {
  const originalMatchMedia = window.matchMedia;
  // Track registered window event listeners per type.
  const windowListeners: Record<string, EventListener[]> = {};

  beforeEach(() => {
    // Reset listener registry.
    for (const k of Object.keys(windowListeners)) delete windowListeners[k];

    // Stub matchMedia to report "not standalone" by default.
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    // Stub addEventListener / removeEventListener with a registry so we can
    // fire events manually. vi.stubGlobal properly saves & restores originals.
    vi.stubGlobal('addEventListener', (type: string, cb: EventListener) => {
      if (!windowListeners[type]) windowListeners[type] = [];
      windowListeners[type].push(cb);
    });
    vi.stubGlobal('removeEventListener', (type: string, cb: EventListener) => {
      windowListeners[type] = (windowListeners[type] || []).filter((l) => l !== cb);
    });
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.unstubAllGlobals();
  });

  /** Fire a synthetic event at window listeners of the given type. */
  function fire(type: string, event: Event = new Event(type)) {
    (windowListeners[type] || []).forEach((cb) => cb(event));
  }

  it('reports not installed and not installable by default (no beforeinstallprompt)', () => {
    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.isInstalled).toBe(false);
    expect(result.current.canInstall).toBe(false);
  });

  it('becomes installable after beforeinstallprompt fires', () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canInstall).toBe(false);

    // Simulate the browser firing the installable event (flush state update).
    const promptEvent = new Event('beforeinstallprompt');
    vi.spyOn(promptEvent, 'preventDefault');
    act(() => {
      fire('beforeinstallprompt', promptEvent);
    });

    expect(result.current.canInstall).toBe(true);
    expect(result.current.isInstalled).toBe(false);
  });

  it('detects installed state from display-mode: standalone', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.isInstalled).toBe(true);
    expect(result.current.canInstall).toBe(false);
  });

  it('promptInstall triggers the deferred prompt and marks installed on accept', async () => {
    const { result } = renderHook(() => useInstallPrompt());

    // Fire beforeinstallprompt with a mock prompt() and userChoice.
    const promptEvent = new Event('beforeinstallprompt') as Event & {
      prompt: () => void;
      userChoice: Promise<{ outcome: string }>;
    };
    vi.spyOn(promptEvent, 'preventDefault');
    promptEvent.prompt = vi.fn();
    promptEvent.userChoice = Promise.resolve({ outcome: 'accepted' });
    act(() => {
      fire('beforeinstallprompt', promptEvent);
    });

    expect(result.current.canInstall).toBe(true);

    let accepted = false;
    await act(async () => {
      accepted = await result.current.promptInstall();
    });

    expect(accepted).toBe(true);
    expect(promptEvent.prompt).toHaveBeenCalled();
    expect(result.current.isInstalled).toBe(true);
    expect(result.current.canInstall).toBe(false);
  });

  it('promptInstall returns false when no deferred prompt exists', async () => {
    const { result } = renderHook(() => useInstallPrompt());

    let accepted = true;
    await act(async () => {
      accepted = await result.current.promptInstall();
    });

    expect(accepted).toBe(false);
  });
});
