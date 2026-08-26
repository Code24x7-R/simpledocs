// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Tests for CloudStorageModal component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import CloudStorageModal from './CloudStorageModal';

// Mock all cloud provider modules
vi.mock('../../utils/driveApi', () => ({
  listFiles: vi.fn(() => Promise.resolve([])),
  createFile: vi.fn(() => Promise.resolve({ id: 'new-file', name: 'test.sdjson' })),
  downloadFile: vi.fn(() => Promise.resolve('{"content": "test"}')),
  deleteFile: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../utils/pickerApi', () => ({
  openPicker: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../utils/driveAuth', () => ({
  requestAccessToken: vi.fn(() => Promise.resolve('mock-token')),
  signOut: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../utils/onedriveApi', () => ({
  listFiles: vi.fn(() => Promise.resolve([])),
  createFile: vi.fn(() => Promise.resolve({ id: 'new-file', name: 'test.sdjson' })),
  downloadFile: vi.fn(() => Promise.resolve('{"content": "test"}')),
  deleteFile: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../utils/onedriveAuth', () => ({
  signIn: vi.fn(() => Promise.resolve('mock-ms-token')),
  signOut: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../utils/s3Api', () => ({
  listFiles: vi.fn(() => Promise.resolve([])),
  createFile: vi.fn(() => Promise.resolve({ key: 'test.sdjson', name: 'test.sdjson' })),
  downloadFile: vi.fn(() => Promise.resolve('{"content": "test"}')),
  deleteFile: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../utils/s3Config', () => ({
  loadS3Config: vi.fn(() => ({
    endpoint: '',
    region: 'us-east-1',
    bucket: '',
    accessKey: '',
    secretKey: '',
    prefix: '',
    forcePathStyle: false,
  })),
  isS3Configured: vi.fn(() => false),
}));

interface S3ConfigModalMockProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

// Mock S3ConfigModal to isolate CloudStorageModal
vi.mock('./S3ConfigModal', () => ({
  default: vi.fn(({ isOpen, onClose, onSaved }: S3ConfigModalMockProps) => {
    if (!isOpen) return null;
    return (
      <div data-testid="s3-config-modal-mock">
        <button onClick={() => { onSaved?.(); onClose?.(); }} data-testid="s3-config-save-mock">Save Config</button>
        <button onClick={onClose} data-testid="s3-config-close-mock">Close</button>
      </div>
    );
  }),
}));

import { listFiles as listGoogleFiles, createFile as createGoogleFile, downloadFile as downloadGoogleFile, deleteFile as deleteGoogleFile } from '../../utils/driveApi';
import { openPicker } from '../../utils/pickerApi';
import { requestAccessToken as getGoogleToken, signOut as googleSignOut } from '../../utils/driveAuth';
import { listFiles as listOneDriveFiles, createFile as createOneDriveFile, downloadFile as downloadOneDriveFile, deleteFile as deleteOneDriveFile } from '../../utils/onedriveApi';
import { signIn as signInOneDrive, signOut as signOutOneDrive } from '../../utils/onedriveAuth';
import { listFiles as listS3Files, createFile as createS3File, downloadFile as downloadS3File, deleteFile as deleteS3File } from '../../utils/s3Api';
import { isS3Configured } from '../../utils/s3Config';

// A full DocState JSON string (has title + id + settings) for tests that
// inspect what gets passed to shareUrl / webShare.
const fullDocContent = JSON.stringify({
  id: 'test-123',
  title: 'Test Document',
  createdAt: '2026-08-02T00:00:00Z',
  updatedAt: '2026-08-02T00:00:00Z',
  totalPages: 1,
  settings: {
    pageFormat: 'A4',
    orientation: 'portrait',
    margins: { top: '20mm', bottom: '20mm', left: '25mm', right: '25mm' },
    header: { enabled: false, content: '' },
    footer: { enabled: false, showPageNumbers: false },
    pageGap: 24,
    orphans: 2,
    widows: 2,
    defaultNormalEditorMode: false,
  },
  content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }] },
});

// Mock shareUrl + webShare so modal tests focus on UI wiring, not the
// compression / clipboard internals (those have their own unit tests).
vi.mock('../../utils/shareUrl', () => ({
  encodeDocToUrl: vi.fn((doc: Record<string, unknown>) =>
    `https://simpledocs.app/#doc=ENCODED_${(doc as { title?: string }).title ?? 'untitled'}`,
  ),
  canShareViaUrl: vi.fn(() => true),
  estimateShareSize: vi.fn(() => 2048),
  MAX_SHARE_SIZE: 30 * 1024,
}));

vi.mock('../../utils/webShare', () => ({
  shareDocument: vi.fn(() => Promise.resolve('shared' as const)),
}));

import { encodeDocToUrl, canShareViaUrl } from '../../utils/shareUrl';
import { shareDocument } from '../../utils/webShare';

describe('CloudStorageModal', () => {
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
    // Suppress window.confirm
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    // Default: S3 not configured
    vi.mocked(isS3Configured).mockReturnValue(false);
    // Stub clipboard (jsdom has no navigator.clipboard).
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn(() => Promise.resolve()) },
    });
    // jsdom lacks URL.createObjectURL / revokeObjectURL.
    if (!URL.createObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        writable: true,
        value: vi.fn(() => 'blob:mock'),
      });
    }
    if (!URL.revokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        writable: true,
        value: vi.fn(),
      });
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────

  describe('rendering', () => {
    it('renders the modal when isOpen is true', () => {
      render(<CloudStorageModal {...defaultProps} />);
      expect(screen.getByText('Save to Cloud')).toBeInTheDocument();
    });

    it('shows "Open from Cloud" header in open mode', () => {
      render(<CloudStorageModal {...defaultProps} mode="open" />);
      expect(screen.getByText('Open from Cloud')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<CloudStorageModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Save to Cloud')).not.toBeInTheDocument();
    });

    it('shows provider selection when no provider connected', () => {
      render(<CloudStorageModal {...defaultProps} />);
      expect(screen.getByText('Google Drive')).toBeInTheDocument();
      expect(screen.getByText('OneDrive')).toBeInTheDocument();
      expect(screen.getByText('S3-Compatible Storage')).toBeInTheDocument();
    });

    it('shows .sdjson format info', () => {
      render(<CloudStorageModal {...defaultProps} />);
      // Multiple .sdjson references exist (info text + footer); assert at least one
      expect(screen.getAllByText(/\.sdjson/).length).toBeGreaterThan(0);
    });
  });

  // ── Google Drive ──────────────────────────────────────────

  describe('Google Drive', () => {
    it('connects to Google Drive and loads files', async () => {
      const mockFiles = [
        { id: 'g1', name: 'GoogleDoc.sdjson', mimeType: '', createdTime: '', modifiedTime: '2026-01-02' },
      ];
      vi.mocked(listGoogleFiles).mockResolvedValue(mockFiles);

      render(<CloudStorageModal {...defaultProps} mode="open" />);

      await act(async () => {
        fireEvent.click(screen.getByText('Google Drive'));
      });

      await waitFor(() => {
        expect(screen.getByText('GoogleDoc.sdjson')).toBeInTheDocument();
      });
      expect(getGoogleToken).toHaveBeenCalled();
    });

    it('shows error when Google auth fails', async () => {
      vi.mocked(getGoogleToken).mockRejectedValue(new Error('Auth cancelled'));

      render(<CloudStorageModal {...defaultProps} />);

      await act(async () => {
        fireEvent.click(screen.getByText('Google Drive'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Auth cancelled/)).toBeInTheDocument();
      });
    });

    it('saves to Google Drive with .sdjson extension', async () => {
      vi.mocked(listGoogleFiles).mockResolvedValue([]);

      render(<CloudStorageModal {...defaultProps} mode="save" />);

      await act(async () => {
        fireEvent.click(screen.getByText('Google Drive'));
      });

      await waitFor(() => {
        expect(screen.getByText('Save to Drive')).toBeInTheDocument();
      });

      // Type a filename
      const input = screen.getByPlaceholderText('Document name');
      fireEvent.change(input, { target: { value: 'MyDoc' } });

      await act(async () => {
        fireEvent.click(screen.getByText('Save to Drive'));
      });

      expect(createGoogleFile).toHaveBeenCalledWith('MyDoc.sdjson', defaultProps.documentContent);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('opens a file from Google Drive list', async () => {
      const mockFiles = [
        { id: 'g1', name: 'GoogleDoc.sdjson', mimeType: '', createdTime: '', modifiedTime: '2026-01-02' },
      ];
      vi.mocked(listGoogleFiles).mockResolvedValue(mockFiles);
      vi.mocked(downloadGoogleFile).mockResolvedValue('{"data": "from-google"}');

      render(<CloudStorageModal {...defaultProps} mode="open" />);

      await act(async () => {
        fireEvent.click(screen.getByText('Google Drive'));
      });

      await waitFor(() => {
        expect(screen.getByText('GoogleDoc.sdjson')).toBeInTheDocument();
      });

      // Hover to reveal Open button (opacity-based), click it
      const openButton = screen.getByText('Open');
      await act(async () => {
        fireEvent.click(openButton);
      });

      await waitFor(() => {
        expect(defaultProps.onOpenDocument).toHaveBeenCalledWith('{"data": "from-google"}', 'GoogleDoc.sdjson');
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });

    it('opens file via Google Picker', async () => {
      vi.mocked(listGoogleFiles).mockResolvedValue([]);
      vi.mocked(openPicker).mockResolvedValue([
        { id: 'picked1', name: 'PickedDoc.sdjson', url: '', mimeType: '' },
      ]);
      vi.mocked(downloadGoogleFile).mockResolvedValue('{"data": "picked"}');

      render(<CloudStorageModal {...defaultProps} mode="open" />);

      await act(async () => {
        fireEvent.click(screen.getByText('Google Drive'));
      });

      await waitFor(() => {
        expect(screen.getByText('Browse')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Browse'));
      });

      await waitFor(() => {
        expect(defaultProps.onOpenDocument).toHaveBeenCalledWith('{"data": "picked"}', 'PickedDoc.sdjson');
      });
    });

    it('deletes a file from Google Drive', async () => {
      const mockFiles = [
        { id: 'g1', name: 'ToDelete.sdjson', mimeType: '', createdTime: '', modifiedTime: '2026-01-02' },
      ];
      vi.mocked(listGoogleFiles).mockResolvedValue(mockFiles);

      render(<CloudStorageModal {...defaultProps} mode="open" />);

      await act(async () => {
        fireEvent.click(screen.getByText('Google Drive'));
      });

      await waitFor(() => {
        expect(screen.getByText('ToDelete.sdjson')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButton = screen.getByTitle('Delete');
      await act(async () => {
        fireEvent.click(deleteButton);
      });

      expect(deleteGoogleFile).toHaveBeenCalledWith('g1');
    });
  });

  // ── OneDrive ──────────────────────────────────────────────

  describe('OneDrive', () => {
    it('connects to OneDrive and loads files', async () => {
      const mockItems = [
        { id: 'od1', name: 'OneDriveDoc.sdjson', createdDateTime: '', lastModifiedDateTime: '2026-01-03', size: 100 },
      ];
      vi.mocked(listOneDriveFiles).mockResolvedValue(mockItems);

      render(<CloudStorageModal {...defaultProps} mode="open" />);

      await act(async () => {
        fireEvent.click(screen.getByText('OneDrive'));
      });

      await waitFor(() => {
        expect(screen.getByText('OneDriveDoc.sdjson')).toBeInTheDocument();
      });
      expect(signInOneDrive).toHaveBeenCalled();
    });

    it('shows error when OneDrive auth fails', async () => {
      vi.mocked(signInOneDrive).mockRejectedValue(new Error('MS login failed'));

      render(<CloudStorageModal {...defaultProps} />);

      await act(async () => {
        fireEvent.click(screen.getByText('OneDrive'));
      });

      await waitFor(() => {
        expect(screen.getByText(/MS login failed/)).toBeInTheDocument();
      });
    });

    it('saves to OneDrive', async () => {
      vi.mocked(listOneDriveFiles).mockResolvedValue([]);

      render(<CloudStorageModal {...defaultProps} mode="save" />);

      await act(async () => {
        fireEvent.click(screen.getByText('OneDrive'));
      });

      await waitFor(() => {
        expect(screen.getByText('Save to OneDrive')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Document name');
      fireEvent.change(input, { target: { value: 'OneDriveDoc' } });

      await act(async () => {
        fireEvent.click(screen.getByText('Save to OneDrive'));
      });

      expect(createOneDriveFile).toHaveBeenCalledWith('OneDriveDoc.sdjson', defaultProps.documentContent);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('opens a file from OneDrive list', async () => {
      const mockItems = [
        { id: 'od1', name: 'OneDriveDoc.sdjson', createdDateTime: '', lastModifiedDateTime: '2026-01-03', size: 100 },
      ];
      vi.mocked(listOneDriveFiles).mockResolvedValue(mockItems);
      vi.mocked(downloadOneDriveFile).mockResolvedValue('{"data": "from-onedrive"}');

      render(<CloudStorageModal {...defaultProps} mode="open" />);

      await act(async () => {
        fireEvent.click(screen.getByText('OneDrive'));
      });

      await waitFor(() => {
        expect(screen.getByText('OneDriveDoc.sdjson')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Open'));
      });

      await waitFor(() => {
        expect(defaultProps.onOpenDocument).toHaveBeenCalledWith('{"data": "from-onedrive"}', 'OneDriveDoc.sdjson');
      });
    });

    it('deletes a file from OneDrive', async () => {
      const mockItems = [
        { id: 'od1', name: 'ToDelete.sdjson', createdDateTime: '', lastModifiedDateTime: '2026-01-03', size: 100 },
      ];
      vi.mocked(listOneDriveFiles).mockResolvedValue(mockItems);

      render(<CloudStorageModal {...defaultProps} mode="open" />);

      await act(async () => {
        fireEvent.click(screen.getByText('OneDrive'));
      });

      await waitFor(() => {
        expect(screen.getByText('ToDelete.sdjson')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTitle('Delete'));
      });

      expect(deleteOneDriveFile).toHaveBeenCalledWith('od1');
    });
  });

  // ── S3-Compatible ─────────────────────────────────────────

  describe('S3-Compatible Storage', () => {
    it('opens S3 config modal when not configured', async () => {
      vi.mocked(isS3Configured).mockReturnValue(false);

      render(<CloudStorageModal {...defaultProps} mode="save" />);

      await act(async () => {
        fireEvent.click(screen.getByText('S3-Compatible Storage'));
      });

      // Should open the S3 config modal
      await waitFor(() => {
        expect(screen.getByTestId('s3-config-modal-mock')).toBeInTheDocument();
      });
    });

    it('connects to S3 when configured', async () => {
      vi.mocked(isS3Configured).mockReturnValue(true);
      const mockObjects = [
        { key: 'docs/S3Doc.sdjson', name: 'S3Doc.sdjson', lastModified: '2026-01-04', size: 200 },
      ];
      vi.mocked(listS3Files).mockResolvedValue(mockObjects);

      render(<CloudStorageModal {...defaultProps} mode="open" />);

      await act(async () => {
        fireEvent.click(screen.getByText('S3-Compatible Storage'));
      });

      await waitFor(() => {
        expect(screen.getByText('S3Doc.sdjson')).toBeInTheDocument();
      });
    });

    it('shows error when S3 connection fails', async () => {
      vi.mocked(isS3Configured).mockReturnValue(true);
      vi.mocked(listS3Files).mockRejectedValue(new Error('S3 endpoint unreachable'));

      render(<CloudStorageModal {...defaultProps} />);

      await act(async () => {
        fireEvent.click(screen.getByText('S3-Compatible Storage'));
      });

      await waitFor(() => {
        expect(screen.getByText(/S3 endpoint unreachable/)).toBeInTheDocument();
      });
    });

    it('saves to S3', async () => {
      vi.mocked(isS3Configured).mockReturnValue(true);
      vi.mocked(listS3Files).mockResolvedValue([]);

      render(<CloudStorageModal {...defaultProps} mode="save" />);

      await act(async () => {
        fireEvent.click(screen.getByText('S3-Compatible Storage'));
      });

      await waitFor(() => {
        expect(screen.getByText('Save to S3')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Document name');
      fireEvent.change(input, { target: { value: 'S3Doc' } });

      await act(async () => {
        fireEvent.click(screen.getByText('Save to S3'));
      });

      expect(createS3File).toHaveBeenCalledWith('S3Doc.sdjson', defaultProps.documentContent);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('opens a file from S3 list', async () => {
      vi.mocked(isS3Configured).mockReturnValue(true);
      const mockObjects = [
        { key: 'docs/S3Doc.sdjson', name: 'S3Doc.sdjson', lastModified: '2026-01-04', size: 200 },
      ];
      vi.mocked(listS3Files).mockResolvedValue(mockObjects);
      vi.mocked(downloadS3File).mockResolvedValue('{"data": "from-s3"}');

      render(<CloudStorageModal {...defaultProps} mode="open" />);

      await act(async () => {
        fireEvent.click(screen.getByText('S3-Compatible Storage'));
      });

      await waitFor(() => {
        expect(screen.getByText('S3Doc.sdjson')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Open'));
      });

      await waitFor(() => {
        expect(defaultProps.onOpenDocument).toHaveBeenCalledWith('{"data": "from-s3"}', 'S3Doc.sdjson');
      });
    });

    it('deletes a file from S3', async () => {
      vi.mocked(isS3Configured).mockReturnValue(true);
      const mockObjects = [
        { key: 'docs/ToDelete.sdjson', name: 'ToDelete.sdjson', lastModified: '2026-01-04', size: 200 },
      ];
      vi.mocked(listS3Files).mockResolvedValue(mockObjects);

      render(<CloudStorageModal {...defaultProps} mode="open" />);

      await act(async () => {
        fireEvent.click(screen.getByText('S3-Compatible Storage'));
      });

      await waitFor(() => {
        expect(screen.getByText('ToDelete.sdjson')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTitle('Delete'));
      });

      expect(deleteS3File).toHaveBeenCalledWith('docs/ToDelete.sdjson');
    });

    it('shows Configure button for S3 in open mode', async () => {
      vi.mocked(isS3Configured).mockReturnValue(true);
      vi.mocked(listS3Files).mockResolvedValue([]);

      render(<CloudStorageModal {...defaultProps} mode="open" />);

      await act(async () => {
        fireEvent.click(screen.getByText('S3-Compatible Storage'));
      });

      await waitFor(() => {
        expect(screen.getByText('Configure')).toBeInTheDocument();
      });
    });

    it('shows Configure button for S3 in save mode', async () => {
      vi.mocked(isS3Configured).mockReturnValue(true);
      vi.mocked(listS3Files).mockResolvedValue([]);

      render(<CloudStorageModal {...defaultProps} mode="save" />);

      await act(async () => {
        fireEvent.click(screen.getByText('S3-Compatible Storage'));
      });

      await waitFor(() => {
        expect(screen.getByText('Configure')).toBeInTheDocument();
      });
    });
  });

  // ── Common behaviors ──────────────────────────────────────

  describe('common behaviors', () => {
    it('shows empty state when no files exist', async () => {
      vi.mocked(listGoogleFiles).mockResolvedValue([]);

      render(<CloudStorageModal {...defaultProps} mode="open" />);

      await act(async () => {
        fireEvent.click(screen.getByText('Google Drive'));
      });

      await waitFor(() => {
        expect(screen.getByText(/No SimpleDocs files found/)).toBeInTheDocument();
      });
    });

    it('shows loading state while fetching files', async () => {
      let resolveFiles: (files: { id: string; name: string; mimeType: string; createdTime: string; modifiedTime: string }[]) => void;
      vi.mocked(listGoogleFiles).mockImplementation(() => new Promise((resolve) => {
        resolveFiles = resolve;
      }));

      render(<CloudStorageModal {...defaultProps} mode="open" />);

      await act(async () => {
        fireEvent.click(screen.getByText('Google Drive'));
      });

      // Should show loading
      await waitFor(() => {
        expect(screen.getByText('Loading files...')).toBeInTheDocument();
      });

      // Resolve the files
      await act(async () => {
        resolveFiles!([]);
      });

      await waitFor(() => {
        expect(screen.getByText(/No SimpleDocs files found/)).toBeInTheDocument();
      });
    });

    it('calls onClose when close button clicked', () => {
      const onClose = vi.fn();
      render(<CloudStorageModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByTitle('Close'));
      expect(onClose).toHaveBeenCalled();
    });

    it('resets state when modal reopens', async () => {
      vi.mocked(listGoogleFiles).mockResolvedValue([
        { id: 'g1', name: 'Doc.sdjson', mimeType: '', createdTime: '', modifiedTime: '2026-01-02' },
      ]);

      const { rerender } = render(<CloudStorageModal {...defaultProps} mode="open" />);

      await act(async () => {
        fireEvent.click(screen.getByText('Google Drive'));
      });

      await waitFor(() => {
        expect(screen.getByText('Doc.sdjson')).toBeInTheDocument();
      });

      // Close the modal
      rerender(<CloudStorageModal {...defaultProps} isOpen={false} mode="open" />);

      // Reopen
      rerender(<CloudStorageModal {...defaultProps} isOpen={true} mode="open" />);

      // Should show provider selection again (state reset)
      expect(screen.getByText('Google Drive')).toBeInTheDocument();
      expect(screen.getByText('OneDrive')).toBeInTheDocument();
    });

    it('prefills document title in save mode', async () => {
      vi.mocked(listGoogleFiles).mockResolvedValue([]);

      render(<CloudStorageModal {...defaultProps} mode="save" documentTitle="My Document" />);

      await act(async () => {
        fireEvent.click(screen.getByText('Google Drive'));
      });

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Document name')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Document name') as HTMLInputElement;
      expect(input.value).toBe('My Document');
    });

    it('disables save button when filename is empty', async () => {
      vi.mocked(listGoogleFiles).mockResolvedValue([]);

      render(<CloudStorageModal {...defaultProps} mode="save" />);

      await act(async () => {
        fireEvent.click(screen.getByText('Google Drive'));
      });

      await waitFor(() => {
        expect(screen.getByText('Save to Drive')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Document name');
      fireEvent.change(input, { target: { value: '' } });

      expect(screen.getByText('Save to Drive')).toBeDisabled();
    });
  });

  // ── Provider switching & disconnect ───────────────────────

  describe('provider switching', () => {
    it('shows Switch provider button after connecting', async () => {
      vi.mocked(listGoogleFiles).mockResolvedValue([]);

      render(<CloudStorageModal {...defaultProps} mode="open" />);

      await act(async () => {
        fireEvent.click(screen.getByText('Google Drive'));
      });

      await waitFor(() => {
        expect(screen.getByText('Switch provider')).toBeInTheDocument();
      });
    });

    it('returns to provider selection when Switch provider clicked', async () => {
      vi.mocked(listGoogleFiles).mockResolvedValue([]);

      render(<CloudStorageModal {...defaultProps} mode="open" />);

      await act(async () => {
        fireEvent.click(screen.getByText('Google Drive'));
      });

      await waitFor(() => {
        expect(screen.getByText('Switch provider')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Switch provider'));
      });

      // Should show all providers again
      expect(screen.getByText('Google Drive')).toBeInTheDocument();
      expect(screen.getByText('OneDrive')).toBeInTheDocument();
      expect(screen.getByText('S3-Compatible Storage')).toBeInTheDocument();
    });

    it('disconnects from Google Drive', async () => {
      vi.mocked(listGoogleFiles).mockResolvedValue([]);

      render(<CloudStorageModal {...defaultProps} mode="open" />);

      await act(async () => {
        fireEvent.click(screen.getByText('Google Drive'));
      });

      await waitFor(() => {
        expect(screen.getByText('Disconnect')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Disconnect'));
      });

      expect(googleSignOut).toHaveBeenCalled();
      // Should return to provider selection
      expect(screen.getByText('Google Drive')).toBeInTheDocument();
      expect(screen.getByText('OneDrive')).toBeInTheDocument();
    });

    it('disconnects from OneDrive', async () => {
      vi.mocked(listOneDriveFiles).mockResolvedValue([]);

      render(<CloudStorageModal {...defaultProps} mode="open" />);

      await act(async () => {
        fireEvent.click(screen.getByText('OneDrive'));
      });

      await waitFor(() => {
        expect(screen.getByText('Disconnect')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Disconnect'));
      });

      expect(signOutOneDrive).toHaveBeenCalled();
      expect(screen.getByText('Google Drive')).toBeInTheDocument();
    });
  });

  // ── Error handling ────────────────────────────────────────

  describe('error handling', () => {
    it('displays error banner when file load fails', async () => {
      vi.mocked(listGoogleFiles).mockRejectedValue(new Error('Network error'));

      render(<CloudStorageModal {...defaultProps} mode="open" />);

      await act(async () => {
        fireEvent.click(screen.getByText('Google Drive'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
    });

    it('allows dismissing error message', async () => {
      vi.mocked(listGoogleFiles).mockRejectedValue(new Error('Load failed'));

      render(<CloudStorageModal {...defaultProps} mode="open" />);

      await act(async () => {
        fireEvent.click(screen.getByText('Google Drive'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Load failed/)).toBeInTheDocument();
      });

      // Find and click the dismiss button in the error banner
      const errorBanner = screen.getByText(/Load failed/).closest('.bg-red-50');
      const dismissButton = errorBanner?.querySelector('button');
      expect(dismissButton).toBeTruthy();

      await act(async () => {
        fireEvent.click(dismissButton!);
      });

      expect(screen.queryByText(/Load failed/)).not.toBeInTheDocument();
    });

    it('shows error when save fails', async () => {
      vi.mocked(listGoogleFiles).mockResolvedValue([]);
      vi.mocked(createGoogleFile).mockRejectedValue(new Error('Quota exceeded'));

      render(<CloudStorageModal {...defaultProps} mode="save" />);

      await act(async () => {
        fireEvent.click(screen.getByText('Google Drive'));
      });

      await waitFor(() => {
        expect(screen.getByText('Save to Drive')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Save to Drive'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Quota exceeded/)).toBeInTheDocument();
      });
    });

    it('shows error when opening a file fails', async () => {
      vi.mocked(listGoogleFiles).mockResolvedValue([
        { id: 'g1', name: 'Broken.sdjson', mimeType: '', createdTime: '', modifiedTime: '2026-01-02' },
      ]);
      vi.mocked(downloadGoogleFile).mockRejectedValue(new Error('Download failed'));

      render(<CloudStorageModal {...defaultProps} mode="open" />);

      await act(async () => {
        fireEvent.click(screen.getByText('Google Drive'));
      });

      await waitFor(() => {
        expect(screen.getByText('Broken.sdjson')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Open'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Download failed/)).toBeInTheDocument();
      });
    });
  });

  // ── Refresh ───────────────────────────────────────────────

  describe('refresh', () => {
    it('refreshes file list when Refresh clicked', async () => {
      vi.mocked(listGoogleFiles).mockResolvedValue([]);

      render(<CloudStorageModal {...defaultProps} mode="open" />);

      await act(async () => {
        fireEvent.click(screen.getByText('Google Drive'));
      });

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });

      // Set up new files for the refresh
      vi.mocked(listGoogleFiles).mockResolvedValue([
        { id: 'g2', name: 'NewFile.sdjson', mimeType: '', createdTime: '', modifiedTime: '2026-01-05' },
      ]);

      await act(async () => {
        fireEvent.click(screen.getByText('Refresh'));
      });

      await waitFor(() => {
        expect(screen.getByText('NewFile.sdjson')).toBeInTheDocument();
      });

      expect(listGoogleFiles).toHaveBeenCalledTimes(2);
    });
  });

  // ── Userland sharing (no accounts) ──────────────────────

  describe('userland sharing', () => {
    it('shows Copy Link / Share File / Save to File in save mode', () => {
      render(<CloudStorageModal {...defaultProps} mode="save" />);
      expect(screen.getByText('Copy Link')).toBeInTheDocument();
      expect(screen.getByText('Share File')).toBeInTheDocument();
      expect(screen.getByText('Save to File')).toBeInTheDocument();
    });

    it('shows Open from File in open mode', () => {
      render(<CloudStorageModal {...defaultProps} mode="open" />);
      expect(screen.getByText('Open from File')).toBeInTheDocument();
    });

    it('hides cloud providers behind an Advanced collapsible by default', () => {
      render(<CloudStorageModal {...defaultProps} mode="save" />);
      // Providers exist in the DOM (inside <details>) but the section is not
      // the primary focus — the userland actions are rendered first.
      expect(screen.getByText('Copy Link')).toBeInTheDocument();
      expect(screen.getByText('Advanced: cloud accounts')).toBeInTheDocument();
    });

    it('Copy Link encodes the document and copies the URL to clipboard', async () => {
      render(<CloudStorageModal {...defaultProps} mode="save" documentContent={fullDocContent} />);

      await act(async () => {
        fireEvent.click(screen.getByText('Copy Link'));
      });

      expect(encodeDocToUrl).toHaveBeenCalledTimes(1);
      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('#doc=ENCODED_Test Document'),
      );
    });

    it('Copy Link shows a brief "Link copied!" confirmation', async () => {
      vi.useFakeTimers();
      render(<CloudStorageModal {...defaultProps} mode="save" />);

      await act(async () => {
        fireEvent.click(screen.getByText('Copy Link'));
      });

      expect(screen.getByText('Link copied!')).toBeInTheDocument();

      vi.useRealTimers();
    });

    it('Share File calls shareDocument with the doc and title', async () => {
      render(<CloudStorageModal {...defaultProps} mode="save" documentContent={fullDocContent} />);

      await act(async () => {
        fireEvent.click(screen.getByText('Share File'));
      });

      expect(shareDocument).toHaveBeenCalledTimes(1);
      // shareDocument receives the parsed doc object and the title string.
      expect(shareDocument).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Test Document' }),
        'Test Document',
      );
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('Save to File triggers a download and closes', async () => {
      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => {});

      render(<CloudStorageModal {...defaultProps} mode="save" />);

      await act(async () => {
        fireEvent.click(screen.getByText('Save to File'));
      });

      expect(clickSpy).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
      clickSpy.mockRestore();
    });

    it('Save to File shows auto-rename guidance', () => {
      render(<CloudStorageModal {...defaultProps} mode="save" />);
      expect(screen.getByText(/auto-rename it/)).toBeInTheDocument();
      expect(screen.getByText(/doc \(1\).sdjson/)).toBeInTheDocument();
      expect(screen.getByText(/Delete or rename the existing file first/)).toBeInTheDocument();
    });

    it('Open from File clicks the hidden file input', () => {
      const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

      render(<CloudStorageModal {...defaultProps} mode="open" />);

      fireEvent.click(screen.getByText('Open from File'));
      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });

    it('reads a picked file and passes its text to onOpenDocument', async () => {
      // jsdom does not implement Blob.text() (available in real browsers),
      // so polyfill it for this test to exercise the async file-read path.
      if (typeof Blob.prototype.text !== 'function') {
        Blob.prototype.text = function () {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(this);
          });
        };
      }

      const onOpenDocument = vi.fn();
      render(
        <CloudStorageModal
          {...defaultProps}
          mode="open"
          onOpenDocument={onOpenDocument}
        />,
      );

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeTruthy();

      const fileContent = JSON.stringify({
        id: 'local-1',
        title: 'Local Doc',
        settings: {},
        content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'From disk' }] }] },
      });
      const file = new File([fileContent], 'local.sdjson', { type: 'application/json' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(onOpenDocument).toHaveBeenCalledWith(fileContent, 'local.sdjson');
      });
    });

    it('disables Copy Link and warns when the document is too large', () => {
      // Force the size guard to treat the doc as too large for this test.
      vi.mocked(canShareViaUrl).mockReturnValue(false);

      render(<CloudStorageModal {...defaultProps} mode="save" />);

      const copyLinkBtn = screen.getByText('Copy Link').closest('button') as HTMLButtonElement;
      expect(copyLinkBtn.disabled).toBe(true);
      expect(screen.getByText(/Too large for a link/)).toBeInTheDocument();
    });
  });
});
