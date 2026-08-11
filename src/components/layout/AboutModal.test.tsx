// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AboutModal from './AboutModal';

describe('AboutModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(<AboutModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the modal when isOpen is true', () => {
    render(<AboutModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('About simpledocs')).toBeInTheDocument();
  });

  it('displays the app name', () => {
    render(<AboutModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('simpledocs')).toBeInTheDocument();
  });

  it('displays the Simple Web Apps caption', () => {
    render(<AboutModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Simple Web Apps')).toBeInTheDocument();
  });

  it('displays the tagline', () => {
    render(<AboutModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Work faster, keep it Simple')).toBeInTheDocument();
  });

  it('displays version info', () => {
    render(<AboutModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Version')).toBeInTheDocument();
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
  });

  it('displays build date', () => {
    render(<AboutModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Build')).toBeInTheDocument();
  });

  it('displays commit hash', () => {
    render(<AboutModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Commit')).toBeInTheDocument();
  });

  it('displays the support link with correct href', () => {
    render(<AboutModal isOpen={true} onClose={vi.fn()} />);
    const link = screen.getByText('Documentation & Support');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://sites.google.com/view/simplewebapps/home');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('displays a Help icon adjacent to the support link', () => {
    render(<AboutModal isOpen={true} onClose={vi.fn()} />);
    const link = screen.getByText('Documentation & Support');
    const helpIcon = link.querySelector('svg');
    expect(helpIcon).not.toBeNull();
  });

  it('displays the related SimpleSheets app link', () => {
    render(<AboutModal isOpen={true} onClose={vi.fn()} />);
    const span = screen.getByText('SimpleSheets');
    expect(span).toBeInTheDocument();
    const link = span.closest('a');
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute('href', 'https://simplesheets.mouseclick.au');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('displays the MIT license text', () => {
    render(<AboutModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('MIT License')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<AboutModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: '' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<AboutModal isOpen={true} onClose={onClose} />);
    // The backdrop is the outermost div (fixed inset-0)
    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when clicking inside the modal content', () => {
    const onClose = vi.fn();
    render(<AboutModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText('simpledocs').closest('.bg-white')!);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows the app version from __APP_VERSION__', () => {
    // vite.config.ts defines __APP_VERSION__ as '1.0.0' for the test env
    render(<AboutModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
  });
});
