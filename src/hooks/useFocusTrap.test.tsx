// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRef } from 'react';
import { useFocusTrap } from './useFocusTrap';

/** Helper component so we can drive the hook through the React lifecycle */
function TrapHarness({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onKeyDown = useFocusTrap(ref, isOpen, onClose);
  return (
    <div ref={ref} onKeyDown={onKeyDown} tabIndex={-1} role="dialog" aria-modal="true">
      {children}
    </div>
  );
}

describe('useFocusTrap', () => {
  it('returns a keydown handler', () => {
    const onClose = vi.fn();
    render(
      <TrapHarness isOpen={true} onClose={onClose}>
        <button>inside</button>
      </TrapHarness>,
    );
    // The handler is wired; pressing Escape calls onClose
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose on non-Escape, non-Tab keys', () => {
    const onClose = vi.fn();
    render(
      <TrapHarness isOpen={true} onClose={onClose}>
        <button>inside</button>
      </TrapHarness>,
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('wraps focus from last element back to first on Tab', () => {
    const onClose = vi.fn();
    render(
      <TrapHarness isOpen={true} onClose={onClose}>
        <button id="a">a</button>
        <button id="b">b</button>
      </TrapHarness>,
    );
    const a = screen.getByText('a');
    const b = screen.getByText('b');
    b.focus();
    // Tab on last element → wrap to first
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(a);
  });

  it('wraps focus from first element back to last on Shift+Tab', () => {
    const onClose = vi.fn();
    render(
      <TrapHarness isOpen={true} onClose={onClose}>
        <button id="a">a</button>
        <button id="b">b</button>
      </TrapHarness>,
    );
    const a = screen.getByText('a');
    const b = screen.getByText('b');
    a.focus();
    // Shift+Tab on first element → wrap to last
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(b);
  });

  it('Escape calls onClose', () => {
    const onClose = vi.fn();
    render(
      <TrapHarness isOpen={true} onClose={onClose}>
        <button>x</button>
      </TrapHarness>,
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
