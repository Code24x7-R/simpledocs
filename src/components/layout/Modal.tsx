// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useRef } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Extra classes for the inner card (width, padding, max-height, etc.) */
  className?: string;
  /** Clicking the backdrop calls onClose (default true) */
  closeOnBackdrop?: boolean;
  /** Overlay backdrop class (default bg-black/40) */
  backdropClassName?: string;
}

/**
 * Reusable modal shell: fixed overlay + focus trap + Escape-to-close.
 *
 * Moves focus into the card on open, traps Tab within it, and returns focus
 * to the trigger element on close. Each modal only supplies its inner card
 * content; this component owns the overlay and focus management.
 */
export default function Modal({
  isOpen,
  onClose,
  children,
  className = '',
  closeOnBackdrop = true,
  backdropClassName = 'bg-black/40',
}: ModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const onKeyDown = useFocusTrap(cardRef, isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 ${backdropClassName} flex items-center justify-center z-50`}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        ref={cardRef}
        className={`bg-white rounded-lg shadow-xl ${className}`}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        {children}
      </div>
    </div>
  );
}
