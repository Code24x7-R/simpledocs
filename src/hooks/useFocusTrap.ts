// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useEffect, useRef, useCallback } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Trap focus inside `containerRef` while `isOpen` is true, and restore focus
 * to the element that had it before the modal opened when it closes.
 *
 * - Tab / Shift+Tab wrap within the container.
 * - Escape calls `onClose`.
 * - On open, focus moves to the first focusable child (or the container).
 * - On close, focus returns to the previously-focused element.
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement>,
  isOpen: boolean,
  onClose: () => void,
) {
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Save the trigger element the moment the modal opens
  useEffect(() => {
    if (isOpen) {
      previouslyFocused.current = document.activeElement as HTMLElement;
      // Move focus into the modal on the next frame so the DOM is painted
      requestAnimationFrame(() => {
        const container = containerRef.current;
        if (!container) return;
        const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE);
        (focusable[0] ?? container).focus();
      });
    }
  }, [isOpen, containerRef]);

  // Restore focus when the modal closes
  useEffect(() => {
    if (!isOpen && previouslyFocused.current) {
      const el = previouslyFocused.current;
      previouslyFocused.current = null;
      // Delay so the trigger element isn't removed before we focus it
      requestAnimationFrame(() => el?.focus());
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const container = containerRef.current;
      if (!container) return;
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [containerRef, onClose],
  );

  return handleKeyDown;
}
