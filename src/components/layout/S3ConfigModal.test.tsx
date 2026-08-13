// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Tests for S3ConfigModal component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import S3ConfigModal from './S3ConfigModal';

// Mock s3Config utilities
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
  saveS3Config: vi.fn(),
  clearS3Config: vi.fn(),
  isS3Configured: vi.fn(() => false),
}));

// Mock s3Api testConnection
vi.mock('../../utils/s3Api', () => ({
  testConnection: vi.fn(() => Promise.resolve(true)),
}));

import { loadS3Config, saveS3Config, clearS3Config, isS3Configured } from '../../utils/s3Config';
import { testConnection } from '../../utils/s3Api';

describe('S3ConfigModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSaved: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to defaults
    vi.mocked(loadS3Config).mockReturnValue({
      endpoint: '',
      region: 'us-east-1',
      bucket: '',
      accessKey: '',
      secretKey: '',
      prefix: '',
      forcePathStyle: false,
    });
    vi.mocked(isS3Configured).mockReturnValue(false);
    vi.mocked(testConnection).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders the modal when isOpen is true', () => {
      render(<S3ConfigModal {...defaultProps} />);
      expect(screen.getByText('S3-Compatible Storage')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<S3ConfigModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('S3-Compatible Storage')).not.toBeInTheDocument();
    });

    it('shows all form fields', () => {
      render(<S3ConfigModal {...defaultProps} />);
      expect(screen.getByText('Endpoint URL')).toBeInTheDocument();
      expect(screen.getByText('Region')).toBeInTheDocument();
      expect(screen.getByText('Bucket Name')).toBeInTheDocument();
      expect(screen.getByText('Access Key ID')).toBeInTheDocument();
      expect(screen.getByText('Secret Access Key')).toBeInTheDocument();
      expect(screen.getByText('Path Prefix (optional)')).toBeInTheDocument();
      expect(screen.getByText('Use path-style addressing')).toBeInTheDocument();
    });

    it('shows info banner with supported services', () => {
      render(<S3ConfigModal {...defaultProps} />);
      expect(screen.getByText(/AWS S3, MinIO, Wasabi/)).toBeInTheDocument();
    });

    it('shows Test and Save buttons in footer', () => {
      render(<S3ConfigModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: /Test/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
      expect(screen.getByText('Clear config')).toBeInTheDocument();
    });
  });

  describe('form interactions', () => {
    it('updates endpoint field on input', () => {
      render(<S3ConfigModal {...defaultProps} />);
      const endpointInput = screen.getByPlaceholderText('https://s3.amazonaws.com');
      fireEvent.change(endpointInput, { target: { value: 'https://nyc3.digitaloceanspaces.com' } });
      expect(endpointInput).toHaveValue('https://nyc3.digitaloceanspaces.com');
    });

    it('updates bucket field on input', () => {
      render(<S3ConfigModal {...defaultProps} />);
      const bucketInput = screen.getByPlaceholderText('my-simpledocs-bucket');
      fireEvent.change(bucketInput, { target: { value: 'test-bucket' } });
      expect(bucketInput).toHaveValue('test-bucket');
    });

    it('updates region field on input', () => {
      render(<S3ConfigModal {...defaultProps} />);
      const regionInput = screen.getByPlaceholderText('us-east-1') as HTMLInputElement;
      fireEvent.change(regionInput, { target: { value: 'eu-west-1' } });
      expect(regionInput.value).toBe('eu-west-1');
    });

    it('toggles path-style checkbox', () => {
      render(<S3ConfigModal {...defaultProps} />);
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
    });

    it('toggles secret key visibility', () => {
      render(<S3ConfigModal {...defaultProps} />);
      const secretInput = screen.getByPlaceholderText(/wJalrXUtnFEMI/) as HTMLInputElement;
      expect(secretInput.type).toBe('password');

      const toggleButton = screen.getByText('Show');
      fireEvent.click(toggleButton);
      expect(secretInput.type).toBe('text');
    });
  });

  describe('pre-population', () => {
    it('loads existing config from localStorage on open', () => {
      vi.mocked(loadS3Config).mockReturnValue({
        endpoint: 'https://custom.endpoint.com',
        region: 'ap-southeast-1',
        bucket: 'existing-bucket',
        accessKey: 'AKIAEXISTING',
        secretKey: 'existing-secret',
        prefix: 'docs/',
        forcePathStyle: true,
      });

      render(<S3ConfigModal {...defaultProps} />);

      expect(screen.getByPlaceholderText('https://s3.amazonaws.com')).toHaveValue('https://custom.endpoint.com');
      expect(screen.getByPlaceholderText('my-simpledocs-bucket')).toHaveValue('existing-bucket');
      expect(screen.getByPlaceholderText('documents/')).toHaveValue('docs/');
      expect(screen.getByRole('checkbox')).toBeChecked();
    });
  });

  describe('test connection', () => {
    it('shows success message when test passes', async () => {
      vi.mocked(isS3Configured).mockReturnValue(true);
      vi.mocked(testConnection).mockResolvedValue(true);

      render(<S3ConfigModal {...defaultProps} />);

      // Fill required fields so isS3Configured returns true
      fireEvent.change(screen.getByPlaceholderText('https://s3.amazonaws.com'), { target: { value: 'https://s3.amazonaws.com' } });
      fireEvent.change(screen.getByPlaceholderText('my-simpledocs-bucket'), { target: { value: 'test-bucket' } });
      fireEvent.change(screen.getByPlaceholderText('AKIAIOSFODNN7EXAMPLE'), { target: { value: 'AKIA1234' } });
      fireEvent.change(screen.getByPlaceholderText(/wJalrXUtnFEMI/), { target: { value: 'secret123' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Test/i }));
      });

      await waitFor(() => {
        expect(screen.getByText('Connection successful!')).toBeInTheDocument();
      });
    });

    it('shows error message when test fails', async () => {
      vi.mocked(isS3Configured).mockReturnValue(true);
      vi.mocked(testConnection).mockRejectedValue(new Error('Connection refused'));

      render(<S3ConfigModal {...defaultProps} />);

      // Fill required fields
      fireEvent.change(screen.getByPlaceholderText('https://s3.amazonaws.com'), { target: { value: 'https://s3.amazonaws.com' } });
      fireEvent.change(screen.getByPlaceholderText('my-simpledocs-bucket'), { target: { value: 'test-bucket' } });
      fireEvent.change(screen.getByPlaceholderText('AKIAIOSFODNN7EXAMPLE'), { target: { value: 'AKIA1234' } });
      fireEvent.change(screen.getByPlaceholderText(/wJalrXUtnFEMI/), { target: { value: 'secret123' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Test/i }));
      });

      await waitFor(() => {
        expect(screen.getByText(/Connection refused/)).toBeInTheDocument();
      });
    });

    it('shows validation error when fields incomplete', async () => {
      vi.mocked(isS3Configured).mockReturnValue(false);

      render(<S3ConfigModal {...defaultProps} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Test/i }));
      });

      await waitFor(() => {
        expect(screen.getByText(/Please fill in endpoint/)).toBeInTheDocument();
      });
    });
  });

  describe('save', () => {
    it('saves config and calls onSaved', async () => {
      vi.mocked(isS3Configured).mockReturnValue(true);

      render(<S3ConfigModal {...defaultProps} />);

      // Fill required fields
      fireEvent.change(screen.getByPlaceholderText('https://s3.amazonaws.com'), { target: { value: 'https://s3.amazonaws.com' } });
      fireEvent.change(screen.getByPlaceholderText('my-simpledocs-bucket'), { target: { value: 'test-bucket' } });
      fireEvent.change(screen.getByPlaceholderText('AKIAIOSFODNN7EXAMPLE'), { target: { value: 'AKIA1234' } });
      fireEvent.change(screen.getByPlaceholderText(/wJalrXUtnFEMI/), { target: { value: 'secret123' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Save/i }));
      });

      await waitFor(() => {
        expect(saveS3Config).toHaveBeenCalledWith(expect.objectContaining({
          endpoint: 'https://s3.amazonaws.com',
          bucket: 'test-bucket',
        }));
        expect(defaultProps.onSaved).toHaveBeenCalled();
      });
    });

    it('shows success message after save', async () => {
      vi.mocked(isS3Configured).mockReturnValue(true);

      render(<S3ConfigModal {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText('https://s3.amazonaws.com'), { target: { value: 'https://s3.amazonaws.com' } });
      fireEvent.change(screen.getByPlaceholderText('my-simpledocs-bucket'), { target: { value: 'test-bucket' } });
      fireEvent.change(screen.getByPlaceholderText('AKIAIOSFODNN7EXAMPLE'), { target: { value: 'AKIA1234' } });
      fireEvent.change(screen.getByPlaceholderText(/wJalrXUtnFEMI/), { target: { value: 'secret123' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Save/i }));
      });

      await waitFor(() => {
        expect(screen.getByText('Connection successful!')).toBeInTheDocument();
      });
    });

    it('shows validation error when saving with incomplete fields', async () => {
      vi.mocked(isS3Configured).mockReturnValue(false);

      render(<S3ConfigModal {...defaultProps} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Save/i }));
      });

      await waitFor(() => {
        expect(screen.getByText(/Please fill in endpoint/)).toBeInTheDocument();
      });
      expect(saveS3Config).not.toHaveBeenCalled();
    });
  });

  describe('clear config', () => {
    it('clears config and resets form', async () => {
      vi.mocked(loadS3Config).mockReturnValue({
        endpoint: 'https://existing.com',
        region: 'us-west-2',
        bucket: 'existing',
        accessKey: 'AKIA',
        secretKey: 'secret',
        prefix: 'docs/',
        forcePathStyle: true,
      });

      render(<S3ConfigModal {...defaultProps} />);

      // Verify pre-populated
      expect(screen.getByPlaceholderText('https://s3.amazonaws.com')).toHaveValue('https://existing.com');

      await act(async () => {
        fireEvent.click(screen.getByText('Clear config'));
      });

      expect(clearS3Config).toHaveBeenCalled();
      // Form should reset to defaults
      expect(screen.getByPlaceholderText('https://s3.amazonaws.com')).toHaveValue('');
      expect(screen.getByPlaceholderText('my-simpledocs-bucket')).toHaveValue('');
    });
  });

  describe('close', () => {
    it('calls onClose when close button clicked', () => {
      const onClose = vi.fn();
      render(<S3ConfigModal {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByTitle('Close');
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when clicking backdrop', () => {
      const onClose = vi.fn();
      render(<S3ConfigModal {...defaultProps} onClose={onClose} />);

      // The backdrop is the outer div
      const backdrop = screen.getByText('S3-Compatible Storage').closest('.fixed.inset-0');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(onClose).toHaveBeenCalled();
      }
    });
  });

  describe('error dismissal', () => {
    it('allows dismissing error message', async () => {
      vi.mocked(isS3Configured).mockReturnValue(false);

      render(<S3ConfigModal {...defaultProps} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Test/i }));
      });

      await waitFor(() => {
        expect(screen.getByText(/Please fill in endpoint/)).toBeInTheDocument();
      });

      // Find the dismiss X button within the error banner
      const errorBanner = screen.getByText(/Please fill in endpoint/).closest('.bg-red-50');
      const dismissButton = errorBanner?.querySelector('button');
      expect(dismissButton).toBeTruthy();

      await act(async () => {
        fireEvent.click(dismissButton!);
      });

      expect(screen.queryByText(/Please fill in endpoint/)).not.toBeInTheDocument();
    });
  });
});
