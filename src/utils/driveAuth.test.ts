// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Tests for Google Drive authentication module.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Google Identity Services
const mockTokenClient = {
  callback: vi.fn(),
  requestAccessToken: vi.fn(),
};

const mockOauth2 = {
  initTokenClient: vi.fn(() => mockTokenClient),
  revoke: vi.fn(),
};

const mockGoogle = {
  accounts: { oauth2: mockOauth2 },
};

describe('driveAuth', () => {
  beforeEach(() => {
    // Reset module state
    vi.resetModules();

    // Mock window.google
    Object.defineProperty(window, 'google', {
      value: mockGoogle,
      writable: true,
      configurable: true,
    });

    // Mock import.meta.env
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id.apps.googleusercontent.com');

    // Clear fetch mock
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('initDriveAuth', () => {
    it('throws error when VITE_GOOGLE_CLIENT_ID is not set', async () => {
      vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');
      const { initDriveAuth } = await import('./driveAuth');

      await expect(initDriveAuth()).rejects.toThrow('VITE_GOOGLE_CLIENT_ID not configured');
    });

    it('initializes GIS token client when client ID is set', async () => {
      const { initDriveAuth } = await import('./driveAuth');
      await initDriveAuth();

      expect(mockOauth2.initTokenClient).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: 'test-client-id.apps.googleusercontent.com',
          scope: 'https://www.googleapis.com/auth/drive.file',
        })
      );
    });

    it('does not reinitialize if already initialized', async () => {
      const { initDriveAuth } = await import('./driveAuth');
      await initDriveAuth();
      await initDriveAuth();

      // Should only be called once
      expect(mockOauth2.initTokenClient).toHaveBeenCalledTimes(1);
    });
  });

  describe('requestAccessToken', () => {
    it('returns cached token if still valid', async () => {
      const { initDriveAuth, requestAccessToken } = await import('./driveAuth');
      await initDriveAuth();

      // Simulate successful token response
      mockTokenClient.requestAccessToken.mockImplementation(() => {
        mockTokenClient.callback({
          access_token: 'test-token-123',
          expires_in: 3600,
        });
      });

      const token1 = await requestAccessToken();
      expect(token1).toBe('test-token-123');

      // Second call should return cached token (without calling requestAccessToken again)
      const token2 = await requestAccessToken();
      expect(token2).toBe('test-token-123');
      expect(mockTokenClient.requestAccessToken).toHaveBeenCalledTimes(1);
    });

    it('rejects when OAuth returns an error', async () => {
      const { initDriveAuth, requestAccessToken } = await import('./driveAuth');
      await initDriveAuth();

      mockTokenClient.requestAccessToken.mockImplementation(() => {
        mockTokenClient.callback({
          error: 'access_denied',
        });
      });

      await expect(requestAccessToken()).rejects.toThrow('OAuth error: access_denied');
    });
  });

  describe('isSignedIn', () => {
    it('returns false when no token is cached', async () => {
      const { isSignedIn } = await import('./driveAuth');
      expect(isSignedIn()).toBe(false);
    });

    it('returns true when token is valid', async () => {
      const { initDriveAuth, requestAccessToken, isSignedIn } = await import('./driveAuth');
      await initDriveAuth();

      mockTokenClient.requestAccessToken.mockImplementation(() => {
        mockTokenClient.callback({
          access_token: 'valid-token',
          expires_in: 3600,
        });
      });

      await requestAccessToken();
      expect(isSignedIn()).toBe(true);
    });
  });

  describe('getAccessToken', () => {
    it('returns null when not authenticated', async () => {
      const { getAccessToken } = await import('./driveAuth');
      expect(getAccessToken()).toBeNull();
    });

    it('returns token when authenticated', async () => {
      const { initDriveAuth, requestAccessToken, getAccessToken } = await import('./driveAuth');
      await initDriveAuth();

      mockTokenClient.requestAccessToken.mockImplementation(() => {
        mockTokenClient.callback({
          access_token: 'my-access-token',
          expires_in: 3600,
        });
      });

      await requestAccessToken();
      expect(getAccessToken()).toBe('my-access-token');
    });
  });

  describe('signOut', () => {
    it('clears token and calls revoke', async () => {
      const { initDriveAuth, requestAccessToken, signOut, isSignedIn } = await import('./driveAuth');
      await initDriveAuth();

      mockTokenClient.requestAccessToken.mockImplementation(() => {
        mockTokenClient.callback({
          access_token: 'token-to-revoke',
          expires_in: 3600,
        });
      });

      await requestAccessToken();
      expect(isSignedIn()).toBe(true);

      // Mock fetch for revoke endpoint
      vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));

      await signOut();
      expect(isSignedIn()).toBe(false);
    });
  });
});
