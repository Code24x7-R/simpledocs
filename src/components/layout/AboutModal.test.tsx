// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import AboutModal from './AboutModal';

// Mock clipboard utility
const mockCopyToClipboard = vi.fn();
vi.mock('../../utils/clipboard', () => ({
  copyToClipboard: (...args: unknown[]) => mockCopyToClipboard(...args),
}));

describe('AboutModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCopyToClipboard.mockResolvedValue(true);
  });

  it('renders a copy button next to the commit info', () => {
    render(<AboutModal isOpen={true} onClose={vi.fn()} />);
    const copyButton = screen.getByTitle('Copy build info to clipboard');
    expect(copyButton).toBeInTheDocument();
    // Verify it contains the Copy icon initially
    expect(copyButton.querySelector('svg')).toBeInTheDocument();
  });

  it('clicking copy button copies version, build, and commit with labels', async () => {
    render(<AboutModal isOpen={true} onClose={vi.fn()} />);
    const copyButton = screen.getByTitle('Copy build info to clipboard');
    await act(async () => {
      fireEvent.click(copyButton);
    });
    expect(mockCopyToClipboard).toHaveBeenCalledTimes(1);
    const copiedText = mockCopyToClipboard.mock.calls[0][0] as string;
    expect(copiedText).toContain('Version:');
    expect(copiedText).toContain('Build:');
    expect(copiedText).toContain('Commit:');
    expect(copiedText).toContain('1.0.0');
  });

  it('shows a check icon after successful copy', async () => {
    render(<AboutModal isOpen={true} onClose={vi.fn()} />);
    const copyButton = screen.getByTitle('Copy build info to clipboard');
    await act(async () => {
      fireEvent.click(copyButton);
    });
    // After copy, the check icon should appear (green)
    const checkIcon = copyButton.querySelector('svg.text-green-500');
    expect(checkIcon).toBeInTheDocument();
  });

  it('copy button is positioned next to the commit value', () => {
    render(<AboutModal isOpen={true} onClose={vi.fn()} />);
    const commitRow = screen.getByText('Commit').closest('.flex');
    expect(commitRow).toBeInTheDocument();
    const copyButton = commitRow!.querySelector('button');
    expect(copyButton).toBeInTheDocument();
    expect(copyButton).toHaveAttribute('title', 'Copy build info to clipboard');
  });

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
