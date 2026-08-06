// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Google Drive authentication module.
 *
 * Uses Google Identity Services (GIS) for OAuth 2.0 client-side flow.
 * No backend required — all auth happens in the browser.
 *
 * Required setup:
 * 1. Create a Google Cloud project
 * 2. Enable Google Drive API and Picker API
 * 3. Create OAuth 2.0 Client ID (Web application type)
 * 4. Add authorized JavaScript origins (e.g., http://localhost:5173)
 * 5. Set the Client ID in Vite env: VITE_GOOGLE_CLIENT_ID
 *
 * Scopes:
 * - drive.file: Only files created/opened by this app
 * - drive.readonly: Read-only access to all Drive files
 */

const GIS_LOAD_URL = 'https://accounts.google.com/gsi/client';

/** Google Identity Services token client (initialized once). */
let tokenClient: google.accounts.oauth2.TokenClient | null = null;

/** Cached access token (refreshed automatically by GIS). */
let accessToken: string | null = null;

/** Token expiry timestamp (ms). */
let tokenExpiry = 0;

/** Pending promise to avoid duplicate initialization. */
let initPromise: Promise<void> | null = null;

/**
 * Load the Google Identity Services script.
 * Returns a promise that resolves when the script is loaded.
 */
function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Already loaded
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    // Check if script tag already exists
    const existing = document.querySelector(`script[src="${GIS_LOAD_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load GIS script')));
      return;
    }

    const script = document.createElement('script');
    script.src = GIS_LOAD_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load GIS script'));
    document.head.appendChild(script);
  });
}

/**
 * Initialize the Google Identity Services token client.
 * Must be called before any Drive operations.
 */
export async function initDriveAuth(): Promise<void> {
  if (tokenClient) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await loadGisScript();

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) {
      throw new Error('VITE_GOOGLE_CLIENT_ID not configured. Set it in your .env file.');
    }

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: () => {}, // handled via promise below
    });
  })();

  return initPromise;
}

/**
 * Request an access token from the user.
 * Shows the Google consent popup if not already authorized.
 * Returns the access token string.
 */
export async function requestAccessToken(): Promise<string> {
  await initDriveAuth();

  if (!tokenClient) {
    throw new Error('GIS token client not initialized');
  }

  // Return cached token if still valid (with 60s buffer)
  if (accessToken && Date.now() < tokenExpiry - 60000) {
    return accessToken;
  }

  return new Promise((resolve, reject) => {
    tokenClient!.callback = (response) => {
      if (response.error) {
        reject(new Error(`OAuth error: ${response.error}`));
        return;
      }
      accessToken = response.access_token;
      tokenExpiry = Date.now() + (response.expires_in || 3600) * 1000;
      resolve(accessToken);
    };

    // prompt: 'consent' forces the popup (needed for first auth)
    tokenClient!.requestAccessToken({ prompt: 'consent' });
  });
}

/**
 * Revoke the current access token and clear cached state.
 */
export async function signOut(): Promise<void> {
  if (accessToken) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    } catch {
      // Ignore revoke failures — token will expire naturally
    }
  }

  accessToken = null;
  tokenExpiry = 0;

  if (tokenClient) {
    google.accounts.oauth2.revoke(accessToken || '', () => {});
  }
}

/**
 * Check if we have a valid access token (not expired).
 */
export function isSignedIn(): boolean {
  return !!accessToken && Date.now() < tokenExpiry - 60000;
}

/**
 * Get the current access token (may be null if not authenticated).
 */
export function getAccessToken(): string | null {
  return accessToken;
}

// Type declarations for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: google.accounts.oauth2.TokenResponse) => void;
          }) => google.accounts.oauth2.TokenClient;
          revoke: (token: string, callback: () => void) => void;
        };
      };
    };
  }

  namespace google.accounts.oauth2 {
    interface TokenResponse {
      access_token: string;
      expires_in?: number;
      error?: string;
      scope?: string;
      token_type?: string;
    }

    interface TokenClient {
      callback: (response: TokenResponse) => void;
      requestAccessToken: (config?: { prompt?: string }) => void;
    }

    function revoke(token: string, callback: () => void): void;

    function initTokenClient(config: {
      client_id: string;
      scope: string;
      callback: (response: TokenResponse) => void;
    }): TokenClient;
  }
}
