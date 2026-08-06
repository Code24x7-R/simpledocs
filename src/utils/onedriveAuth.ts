// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Microsoft OneDrive authentication module.
 *
 * Uses MSAL.js (@azure/msal-browser) for OAuth 2.0 Authorization Code Flow with PKCE.
 * No backend required — all auth happens in the browser.
 *
 * Required setup:
 * 1. Register an app in Azure AD (Microsoft Entra admin center)
 * 2. Configure as Single Page Application (SPA)
 * 3. Add redirect URI (e.g., http://localhost:5173)
 * 4. Set the Client ID in Vite env: VITE_MICROSOFT_CLIENT_ID
 *
 * API Permissions:
 * - Files.ReadWrite.AppFolder (access only app-created files)
 * - Files.ReadWrite (full access to user's OneDrive)
 */

import { PublicClientApplication, AccountInfo, SilentRequest, PopupRequest, InteractionRequiredAuthError } from '@azure/msal-browser';

const GRAPH_API_SCOPES = ['Files.ReadWrite.AppFolder'];

let msalInstance: PublicClientApplication | null = null;

/**
 * MSAL configuration (lazy-loaded to read env vars at runtime).
 */
function getMsalConfig() {
  const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID as string | undefined;
  if (!clientId) {
    throw new Error('VITE_MICROSOFT_CLIENT_ID not configured. Set it in your .env file.');
  }

  return {
    auth: {
      clientId,
      authority: 'https://login.microsoftonline.com/common',
      redirectUri: window.location.origin,
      postLogoutRedirectUri: window.location.origin,
    },
    cache: {
      cacheLocation: 'localStorage',
      storeAuthStateInCookie: false,
    },
  };
}

/**
 * Initialize the MSAL instance.
 */
async function getMsalInstance(): Promise<PublicClientApplication> {
  if (msalInstance) return msalInstance;

  msalInstance = new PublicClientApplication(getMsalConfig());
  await msalInstance.initialize();
  return msalInstance;
}

/**
 * Sign in the user and get an access token.
 * Uses popup for interactive auth.
 */
export async function signIn(): Promise<string> {
  const instance = await getMsalInstance();

  // Check if already signed in
  const accounts = instance.getAllAccounts();
  if (accounts.length > 0) {
    return acquireTokenSilent(accounts[0]);
  }

  // Interactive sign-in via popup
  const loginRequest: PopupRequest = {
    scopes: GRAPH_API_SCOPES,
    prompt: 'select_account',
  };

  try {
    const response = await instance.loginPopup(loginRequest);
    return response.accessToken;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Microsoft sign-in failed: ${error.message}`);
    }
    throw new Error('Microsoft sign-in failed');
  }
}

/**
 * Acquire a token silently (from cache or refresh).
 */
async function acquireTokenSilent(account: AccountInfo): Promise<string> {
  const instance = await getMsalInstance();

  const silentRequest: SilentRequest = {
    scopes: GRAPH_API_SCOPES,
    account,
  };

  try {
    const response = await instance.acquireTokenSilent(silentRequest);
    return response.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      // Fallback to popup
      const response = await instance.acquireTokenPopup({
        scopes: GRAPH_API_SCOPES,
        account,
      });
      return response.accessToken;
    }
    throw error;
  }
}

/**
 * Reset the MSAL instance (for testing).
 */
export function resetMsalInstance(): void {
  msalInstance = null;
}

/**
 * Get an access token for Microsoft Graph API.
 * Tries silent acquisition first, falls back to popup.
 */
export async function getAccessToken(): Promise<string> {
  const instance = await getMsalInstance();
  const accounts = instance.getAllAccounts();

  if (accounts.length === 0) {
    return signIn();
  }

  return acquireTokenSilent(accounts[0]);
}

/**
 * Sign out the user.
 */
export async function signOut(): Promise<void> {
  const instance = await getMsalInstance();
  const accounts = instance.getAllAccounts();

  if (accounts.length > 0) {
    await instance.logoutPopup({
      account: accounts[0],
    });
  }
}

/**
 * Check if the user is currently signed in.
 */
export function isSignedIn(): boolean {
  if (!msalInstance) return false;
  return msalInstance.getAllAccounts().length > 0;
}

/**
 * Get the current signed-in account (or null).
 */
export function getCurrentAccount(): AccountInfo | null {
  if (!msalInstance) return null;
  const accounts = msalInstance.getAllAccounts();
  return accounts.length > 0 ? accounts[0] : null;
}
