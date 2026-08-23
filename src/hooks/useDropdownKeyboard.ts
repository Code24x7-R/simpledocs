// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useRef, useEffect, useCallback } from 'react';

const FOCUSABLE = 'button:not([disabled]), a[href]';

/**
 * Keyboard navigation for a menubar dropdown.
 *
 * Returns props to spread onto the dropdown container:
 * - `ref`: container ref
 * - `onKeyDown`: Arrow Up/Down (+ Home/End) cycle through focusable items;
 *   Escape closes the menu and returns focus to the trigger button.
 *
 * Pass the menu trigger button element to `registerTrigger` so Escape can
 * return focus to it. The hook auto-focuses the first item when the menu
 * opens.
 */
export function useDropdownKeyboard(isOpen: boolean, onClose: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const getItems = useCallback((): HTMLElement[] => {
    const c = containerRef.current;
    if (!c) return [];
    return Array.from(c.querySelectorAll<HTMLElement>(FOCUSABLE));
  }, []);

  const focusItem = useCallback(
    (index: number) => {
      const items = getItems();
      if (items.length === 0) return;
      items[(index + items.length) % items.length]?.focus();
    },
    [getItems],
  );

  // Move focus into the menu when it opens.
  useEffect(() => {
    if (isOpen) {
      // Delay so the dropdown is painted first.
      const id = requestAnimationFrame(() => {
        const items = getItems();
        items[0]?.focus();
      });
      return () => cancelAnimationFrame(id);
    }
  }, [isOpen, getItems]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        requestAnimationFrame(() => triggerRef.current?.focus());
        return;
      }

      const items = getItems();
      const active = items.indexOf(document.activeElement as HTMLElement);
      if (active === -1) return;

      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          focusItem(active + 1);
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          focusItem(active - 1);
          break;
        case 'Home':
          e.preventDefault();
          focusItem(0);
          break;
        case 'End':
          e.preventDefault();
          focusItem(items.length - 1);
          break;
      }
    },
    [getItems, focusItem, onClose],
  );

  const registerTrigger = useCallback((el: HTMLElement | null) => {
    triggerRef.current = el;
  }, []);

  return { ref: containerRef, onKeyDown, registerTrigger };
}
