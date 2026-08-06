// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Google Drive connection state store.
 *
 * Manages the Drive authentication state and provides actions
 * for connecting/disconnecting from Google Drive.
 */

import { create } from 'zustand';

interface DriveState {
  /** Whether the user is connected to Google Drive. */
  isConnected: boolean;
  /** Whether a Drive operation is in progress. */
  isLoading: boolean;
  /** Error message from the last operation. */
  error: string | null;
  /** User email (if available). */
  userEmail: string | null;

  /** Connect to Google Drive (triggers OAuth flow). */
  connect: () => Promise<void>;
  /** Disconnect from Google Drive. */
  disconnect: () => Promise<void>;
  /** Clear any error message. */
  clearError: () => void;
}

export const useDriveStore = create<DriveState>((set) => ({
  isConnected: false,
  isLoading: false,
  error: null,
  userEmail: null,

  connect: async () => {
    set({ isLoading: true, error: null });
    try {
      const { requestAccessToken, initDriveAuth } = await import('../utils/driveAuth');
      await initDriveAuth();
      await requestAccessToken();
      set({ isConnected: true, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect to Google Drive';
      set({ isConnected: false, isLoading: false, error: message });
    }
  },

  disconnect: async () => {
    set({ isLoading: true, error: null });
    try {
      const { signOut } = await import('../utils/driveAuth');
      await signOut();
      set({ isConnected: false, isLoading: false, userEmail: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disconnect';
      set({ isLoading: false, error: message });
    }
  },

  clearError: () => set({ error: null }),
}));
