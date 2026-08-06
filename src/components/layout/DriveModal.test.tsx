// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Tests for DriveModal component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import DriveModal from './DriveModal';
import { useDriveStore } from '../../store/useDriveStore';

// Mock driveApi
vi.mock('../../utils/driveApi', () => ({
  listFiles: vi.fn(() => Promise.resolve([])),
  createFile: vi.fn(() => Promise.resolve({ id: 'new-file', name: 'test.sdjson' })),
  downloadFile: vi.fn(() => Promise.resolve('{"content": "test"}')),
  deleteFile: vi.fn(() => Promise.resolve()),
  DriveFile: vi.fn(),
}));

// Mock pickerApi
vi.mock('../../utils/pickerApi', () => ({
  openPicker: vi.fn(() => Promise.resolve([])),
}));

// Mock driveAuth
vi.mock('../../utils/driveAuth', () => ({
  requestAccessToken: vi.fn(() => Promise.resolve('mock-token')),
  initDriveAuth: vi.fn(() => Promise.resolve()),
  signOut: vi.fn(() => Promise.resolve()),
}));

describe('DriveModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    mode: 'save' as const,
    documentTitle: 'Test Document',
    documentContent: '{"content": "test"}',
    onOpenDocument: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useDriveStore.setState({
      isConnected: false,
      isLoading: false,
      error: null,
      userEmail: null,
    });
  });

  describe('when not connected', () => {
    it('shows connect button', () => {
      render(<DriveModal {...defaultProps} />);
      expect(screen.getByText('Connect to Google Drive')).toBeInTheDocument();
    });

    it('shows appropriate message for save mode', () => {
      render(<DriveModal {...defaultProps} mode="save" />);
      expect(screen.getByText(/save/)).toBeInTheDocument();
    });

    it('shows appropriate message for open mode', () => {
      render(<DriveModal {...defaultProps} mode="open" />);
      expect(screen.getByText(/open/)).toBeInTheDocument();
    });
  });

  describe('when connected - save mode', () => {
    beforeEach(() => {
      useDriveStore.setState({ isConnected: true });
    });

    it('shows filename input', () => {
      render(<DriveModal {...defaultProps} mode="save" />);
      expect(screen.getByText('File name')).toBeInTheDocument();
    });

    it('prefills document title', () => {
      render(<DriveModal {...defaultProps} mode="save" documentTitle="My Doc" />);
      const input = screen.getByPlaceholderText('Document name') as HTMLInputElement;
      expect(input.value).toBe('My Doc');
    });

    it('shows save button', () => {
      render(<DriveModal {...defaultProps} mode="save" />);
      expect(screen.getByText('Save to Drive')).toBeInTheDocument();
    });

    it('shows .sdjson extension hint', () => {
      render(<DriveModal {...defaultProps} mode="save" />);
      expect(screen.getByText(/\.sdjson/)).toBeInTheDocument();
    });
  });

  describe('when connected - open mode', () => {
    beforeEach(() => {
      useDriveStore.setState({ isConnected: true });
    });

    it('shows browse drive button', () => {
      render(<DriveModal {...defaultProps} mode="open" />);
      expect(screen.getByText('Browse Drive')).toBeInTheDocument();
    });

    it('shows refresh button', () => {
      render(<DriveModal {...defaultProps} mode="open" />);
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    it('shows empty state when no files', async () => {
      const { listFiles } = await import('../../utils/driveApi');
      vi.mocked(listFiles).mockResolvedValue([]);

      render(<DriveModal {...defaultProps} mode="open" />);

      await waitFor(() => {
        expect(screen.getByText(/No SimpleDocs files found/)).toBeInTheDocument();
      });
    });

    it('shows file list when files exist', async () => {
      const mockFiles = [
        { id: 'file1', name: 'Document 1.sdjson', mimeType: 'application/vnd.simpledocs+json', createdTime: '2026-01-01', modifiedTime: '2026-01-02' },
      ];
      const { listFiles } = await import('../../utils/driveApi');
      vi.mocked(listFiles).mockResolvedValue(mockFiles);

      render(<DriveModal {...defaultProps} mode="open" />);

      await waitFor(() => {
        expect(screen.getByText('Document 1.sdjson')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('shows error banner when store has error', () => {
      render(<DriveModal {...defaultProps} />);
      // Set error after render (useEffect clears error on open)
      act(() => {
        useDriveStore.setState({ isConnected: false, error: 'Connection failed' });
      });
      expect(screen.getByText(/Connection failed/)).toBeInTheDocument();
    });

    it('can dismiss error', () => {
      render(<DriveModal {...defaultProps} />);
      // Set error after render (useEffect clears error on open)
      act(() => {
        useDriveStore.setState({ isConnected: false, error: 'Connection failed' });
      });

      // Find the dismiss button (X button in the error banner)
      const errorBanner = screen.getByText(/Connection failed/).closest('.bg-red-50');
      const dismissButton = errorBanner?.querySelector('button');
      expect(dismissButton).toBeTruthy();
      fireEvent.click(dismissButton!);
      expect(screen.queryByText(/Connection failed/)).not.toBeInTheDocument();
    });
  });

  describe('disconnect', () => {
    it('shows disconnect button when connected', () => {
      useDriveStore.setState({ isConnected: true });
      render(<DriveModal {...defaultProps} />);
      expect(screen.getByText('Disconnect')).toBeInTheDocument();
    });
  });

  describe('close', () => {
    it('calls onClose when close button clicked', () => {
      const onClose = vi.fn();
      render(<DriveModal {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByTitle('Close');
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    });

    it('does not render when isOpen is false', () => {
      render(<DriveModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Connect to Google Drive')).not.toBeInTheDocument();
    });
  });
});
