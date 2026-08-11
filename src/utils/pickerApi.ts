// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Google Picker API wrapper.
 *
 * Provides a native Google Drive file browser for opening documents.
 * The Picker API requires an access token and displays a modal dialog.
 */

import { requestAccessToken } from './driveAuth';
import { SIMPLEDOCS_MIME } from './driveApi';

const PICKER_LOAD_URL = 'https://apis.google.com/js/api.js';

/** Picker callback data from Google. */
export interface PickerCallback {
  action: string;
  docs: PickerDocument[];
}

/** A document selected in the Picker. */
export interface PickerDocument {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  description?: string;
  type?: string;
  lastEditedUtc?: number;
  iconUrl?: string;
  serviceId?: string;
}

/** Options for configuring the Picker. */
export interface PickerOptions {
  /** Show folders in the picker (for navigation). */
  showFolders?: boolean;
  /** Allow multiple file selection. */
  multiselect?: boolean;
  /** Parent folder ID to start in. */
  parentId?: string;
  /** Custom title for the picker window. */
  title?: string;
}

/**
 * Load the Google API script (for Picker).
 */
function loadPickerScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.picker) {
      resolve();
      return;
    }

    const existing = document.querySelector(`script[src="${PICKER_LOAD_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Picker script')));
      return;
    }

    const script = document.createElement('script');
    script.src = PICKER_LOAD_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Picker script'));
    document.head.appendChild(script);
  });
}

/**
 * Load the Picker API (must be called after gapi script loads).
 */
function loadPickerApi(): Promise<void> {
  return new Promise((resolve) => {
    window.gapi!.load('picker', { callback: resolve });
  });
}

/**
 * Open the Google Picker dialog.
 * Returns a promise that resolves with the selected document(s).
 */
export async function openPicker(options: PickerOptions = {}): Promise<PickerDocument[]> {
  await loadPickerScript();
  await loadPickerApi();

  const token = await requestAccessToken();

  return new Promise((resolve) => {
    const pickerBuilder = new window.google!.picker.PickerBuilder()
      .setOAuthToken(token)
      .setDeveloperKey(import.meta.env.VITE_GOOGLE_API_KEY as string | undefined || '')
      .setCallback((data: PickerCallback) => {
        if (data.action === window.google!.picker.Action.PICKED) {
          resolve(data.docs);
        } else if (data.action === window.google!.picker.Action.CANCEL) {
          resolve([]);
        }
      });

    // Title
    if (options.title) {
      pickerBuilder.setTitle(options.title);
    }

    // Show folders for navigation
    if (options.showFolders !== false) {
      pickerBuilder.addView(new window.google!.picker.DocsView()
        .setIncludeFolders(true)
        .setMimeTypes(SIMPLEDOCS_MIME)
        .setSelectFolderEnabled(false));
    } else {
      // Documents only
      pickerBuilder.addView(new window.google!.picker.DocsView()
        .setMimeTypes(SIMPLEDOCS_MIME));
    }

    // Start in specific folder
    if (options.parentId) {
      pickerBuilder.addView(new window.google!.picker.DocsView()
        .setIncludeFolders(true)
        .setParent(options.parentId)
        .setMimeTypes(SIMPLEDOCS_MIME));
    }

    // Multiple selection
    if (options.multiselect) {
      pickerBuilder.enableFeature(window.google!.picker.Feature.MULTISELECT_ENABLED);
    }

    const picker = pickerBuilder.build();
    picker.setVisible(true);
  });
}

// Type declarations for Google Picker API and Identity Services
declare global {
  interface Window {
    gapi?: {
      load: (api: string, config: { callback: () => void }) => void;
    };
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
          }) => TokenClient;
          revoke: (token: string, callback: () => void) => void;
        };
      };
      picker: {
        Action: { PICKED: 'picked'; CANCEL: 'cancel' };
        Feature: { MULTISELECT_ENABLED: 'multiselectEnabled' };
        PickerBuilder: new () => PickerBuilder;
        Picker: new () => Picker;
        DocsView: new () => DocsView;
      };
    };
  }

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
}

interface PickerBuilder {
  setOAuthToken(token: string): PickerBuilder;
  setDeveloperKey(key: string): PickerBuilder;
  setTitle(title: string): PickerBuilder;
  setCallback(callback: (data: PickerCallback) => void): PickerBuilder;
  addView(view: View): PickerBuilder;
  enableFeature(feature: Feature): PickerBuilder;
  build(): Picker;
}

interface Picker {
  setVisible(visible: boolean): void;
}

interface DocsView {
  setIncludeFolders(include: boolean): DocsView;
  setMimeTypes(mimeTypes: string): DocsView;
  setSelectFolderEnabled(enabled: boolean): DocsView;
  setParent(parentId: string): DocsView;
}

type View = DocsView;

type Feature = 'multiselectEnabled';
