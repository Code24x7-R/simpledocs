// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { useDropdownKeyboard } from './useDropdownKeyboard';

/** Minimal menu that uses the hook so we can exercise its behavior. */
function TestMenu() {
  const [open, setOpen] = useState(false);
  const kb = useDropdownKeyboard(open, () => setOpen(false));
  return (
    <div>
      <button
        ref={kb.registerTrigger}
        onClick={() => setOpen((v) => !v)}
      >
        Menu
      </button>
      {open && (
        <div ref={kb.ref} onKeyDown={kb.onKeyDown} role="menu">
          <button>One</button>
          <button>Two</button>
          <button>Three</button>
        </div>
      )}
    </div>
  );
}

describe('useDropdownKeyboard', () => {
  it('moves focus into the menu when it opens', async () => {
    render(<TestMenu />);
    // Open the menu.
    fireEvent.click(screen.getByText('Menu'));
    // First item should be focused (via requestAnimationFrame).
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    expect(document.activeElement).toBe(screen.getByText('One'));
  });

  it('ArrowDown cycles to the next item', () => {
    render(<TestMenu />);
    fireEvent.click(screen.getByText('Menu'));
    const two = screen.getByText('Two');
    two.focus();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByText('Three'));
  });

  it('ArrowDown wraps from last to first', () => {
    render(<TestMenu />);
    fireEvent.click(screen.getByText('Menu'));
    const three = screen.getByText('Three');
    three.focus();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByText('One'));
  });

  it('ArrowUp wraps from first to last', () => {
    render(<TestMenu />);
    fireEvent.click(screen.getByText('Menu'));
    const one = screen.getByText('One');
    one.focus();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' });
    expect(document.activeElement).toBe(screen.getByText('Three'));
  });

  it('Escape closes the menu and returns focus to the trigger', async () => {
    render(<TestMenu />);
    const trigger = screen.getByText('Menu');
    fireEvent.click(trigger);
    const two = screen.getByText('Two');
    two.focus();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    // Focus returns to trigger on the next animation frame.
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    expect(document.activeElement).toBe(trigger);
  });

  it('Home / End jump to first / last item', () => {
    render(<TestMenu />);
    fireEvent.click(screen.getByText('Menu'));
    const two = screen.getByText('Two');
    two.focus();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Home' });
    expect(document.activeElement).toBe(screen.getByText('One'));
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'End' });
    expect(document.activeElement).toBe(screen.getByText('Three'));
  });
});
