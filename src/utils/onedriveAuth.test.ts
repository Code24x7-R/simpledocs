// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Tests for Microsoft OneDrive authentication module.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock MSAL
const mockLoginPopup = vi.fn();
const mockLogoutPopup = vi.fn();
const mockAcquireTokenSilent = vi.fn();
const mockAcquireTokenPopup = vi.fn();
const mockGetAllAccounts = vi.fn(() => [] as Array<{ username: string }>);
const mockInitialize = vi.fn(() => Promise.resolve());

class MockInteractionRequiredAuthError extends Error {
  constructor() {
    super('interaction_required');
    this.name = 'InteractionRequiredAuthError';
  }
}

vi.mock('@azure/msal-browser', () => {
  return {
    PublicClientApplication: vi.fn().mockImplementation(() => ({
      initialize: mockInitialize,
      loginPopup: mockLoginPopup,
      logoutPopup: mockLogoutPopup,
      acquireTokenSilent: mockAcquireTokenSilent,
      acquireTokenPopup: mockAcquireTokenPopup,
      getAllAccounts: mockGetAllAccounts,
    })),
    InteractionRequiredAuthError: MockInteractionRequiredAuthError,
  };
});

describe('onedriveAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_MICROSOFT_CLIENT_ID', 'test-ms-client-id');
    mockGetAllAccounts.mockReturnValue([]);
  });

  describe('signIn', () => {
    it('throws error when client ID is not configured', async () => {
      vi.stubEnv('VITE_MICROSOFT_CLIENT_ID', '');
      const { signIn } = await import('./onedriveAuth');

      await expect(signIn()).rejects.toThrow('VITE_MICROSOFT_CLIENT_ID not configured');
    });

    it('calls loginPopup when no accounts exist', async () => {
      mockGetAllAccounts.mockReturnValue([]);
      mockLoginPopup.mockResolvedValue({ accessToken: 'test-token' });

      const { signIn } = await import('./onedriveAuth');
      const token = await signIn();

      expect(mockLoginPopup).toHaveBeenCalledWith(
        expect.objectContaining({
          scopes: ['Files.ReadWrite.AppFolder'],
        })
      );
      expect(token).toBe('test-token');
    });

    it('acquires token silently when account exists', async () => {
      const mockAccount = { username: 'user@example.com' };
      mockGetAllAccounts.mockReturnValue([mockAccount]);
      mockAcquireTokenSilent.mockResolvedValue({ accessToken: 'silent-token' });

      const { signIn } = await import('./onedriveAuth');
      const token = await signIn();

      expect(mockAcquireTokenSilent).toHaveBeenCalledWith(
        expect.objectContaining({
          scopes: ['Files.ReadWrite.AppFolder'],
          account: mockAccount,
        })
      );
      expect(mockLoginPopup).not.toHaveBeenCalled();
      expect(token).toBe('silent-token');
    });

    it('throws user-friendly error on login failure', async () => {
      mockGetAllAccounts.mockReturnValue([]);
      mockLoginPopup.mockRejectedValue(new Error('User cancelled'));

      const { signIn } = await import('./onedriveAuth');
      await expect(signIn()).rejects.toThrow('Microsoft sign-in failed');
    });
  });

  describe('getAccessToken', () => {
    it('calls signIn when no accounts exist', async () => {
      mockGetAllAccounts.mockReturnValue([]);
      mockLoginPopup.mockResolvedValue({ accessToken: 'new-token' });

      const { getAccessToken } = await import('./onedriveAuth');
      const token = await getAccessToken();

      expect(mockLoginPopup).toHaveBeenCalled();
      expect(token).toBe('new-token');
    });

    it('acquires token silently when account exists', async () => {
      const mockAccount = { username: 'user@example.com' };
      mockGetAllAccounts.mockReturnValue([mockAccount]);
      mockAcquireTokenSilent.mockResolvedValue({ accessToken: 'cached-token' });

      const { getAccessToken } = await import('./onedriveAuth');
      const token = await getAccessToken();

      expect(mockAcquireTokenSilent).toHaveBeenCalled();
      expect(token).toBe('cached-token');
    });

    it('falls back to popup on silent failure', async () => {
      const mockAccount = { username: 'user@example.com' };
      mockGetAllAccounts.mockReturnValue([mockAccount]);
      mockAcquireTokenSilent.mockRejectedValue(new MockInteractionRequiredAuthError());
      mockAcquireTokenPopup.mockResolvedValue({ accessToken: 'popup-token' });

      const { getAccessToken } = await import('./onedriveAuth');
      const token = await getAccessToken();

      expect(mockAcquireTokenPopup).toHaveBeenCalled();
      expect(token).toBe('popup-token');
    });
  });

  describe('signOut', () => {
    it('calls logoutPopup with current account', async () => {
      const mockAccount = { username: 'user@example.com' };
      mockGetAllAccounts.mockReturnValue([mockAccount]);

      const { signOut } = await import('./onedriveAuth');
      await signOut();

      expect(mockLogoutPopup).toHaveBeenCalledWith(
        expect.objectContaining({ account: mockAccount })
      );
    });

    it('does nothing when no accounts exist', async () => {
      mockGetAllAccounts.mockReturnValue([]);

      const { signOut } = await import('./onedriveAuth');
      await signOut();

      expect(mockLogoutPopup).not.toHaveBeenCalled();
    });
  });

  describe('isSignedIn', () => {
    it('returns false when no accounts exist', async () => {
      mockGetAllAccounts.mockReturnValue([]);

      const { isSignedIn } = await import('./onedriveAuth');
      expect(isSignedIn()).toBe(false);
    });

    it('returns true when accounts exist', async () => {
      mockGetAllAccounts.mockReturnValue([{ username: 'user@example.com' }]);

      const { isSignedIn } = await import('./onedriveAuth');
      expect(isSignedIn()).toBe(true);
    });
  });

  describe('getCurrentAccount', () => {
    it('returns null when no accounts exist', async () => {
      mockGetAllAccounts.mockReturnValue([]);

      const { getCurrentAccount } = await import('./onedriveAuth');
      expect(getCurrentAccount()).toBeNull();
    });

    it('returns first account when accounts exist', async () => {
      const mockAccount = { username: 'user@example.com' };
      mockGetAllAccounts.mockReturnValue([mockAccount]);

      const { getCurrentAccount } = await import('./onedriveAuth');
      expect(getCurrentAccount()).toEqual(mockAccount);
    });
  });
});
