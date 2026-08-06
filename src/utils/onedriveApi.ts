// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Microsoft OneDrive API wrapper.
 *
 * Provides CRUD operations for documents stored in OneDrive.
 * Uses Microsoft Graph API v1.0.
 */

import { getAccessToken } from './onedriveAuth';

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

/** MIME type for SimpleDocs JSON files. */
export const SIMPLEDOCS_MIME = 'application/json';

/** A drive item from OneDrive. */
export interface OneDriveItem {
  id: string;
  name: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  size: number;
  file?: {
    mimeType: string;
  };
  folder?: {
    childCount: number;
  };
  parentReference?: {
    id: string;
    path: string;
  };
  '@microsoft.graph.downloadUrl'?: string;
}

/** Response from children endpoint. */
interface OneDriveChildrenResponse {
  value: OneDriveItem[];
  '@odata.nextLink'?: string;
}

/**
 * Make an authenticated request to Microsoft Graph API.
 */
async function graphRequest(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${GRAPH_API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OneDrive API error (${response.status}): ${errorText}`);
  }

  return response;
}

/**
 * List SimpleDocs files in the app folder.
 */
export async function listFiles(): Promise<OneDriveItem[]> {
  // Use the special app folder (only files created by this app)
  const response = await graphRequest('/me/drive/special/approot/children?$filter=file%20ne%20null&$orderby=lastModifiedDateTime%20desc');
  const data: OneDriveChildrenResponse = await response.json();
  return data.value;
}

/**
 * List all files in the root of OneDrive.
 */
export async function listAllFiles(): Promise<OneDriveItem[]> {
  const response = await graphRequest('/me/drive/root/children?$filter=file%20ne%20null&$orderby=lastModifiedDateTime%20desc');
  const data: OneDriveChildrenResponse = await response.json();
  return data.value;
}

/**
 * Get file metadata by ID.
 */
export async function getFileMetadata(itemId: string): Promise<OneDriveItem> {
  const response = await graphRequest(`/me/drive/items/${itemId}`);
  return response.json();
}

/**
 * Download file content as text.
 */
export async function downloadFile(itemId: string): Promise<string> {
  const response = await graphRequest(`/me/drive/items/${itemId}/content`);
  return response.text();
}

/**
 * Download file using the direct download URL (faster for large files).
 */
export async function downloadFileFast(itemId: string): Promise<string> {
  const metadata = await getFileMetadata(itemId);
  const downloadUrl = metadata['@microsoft.graph.downloadUrl'];
  if (!downloadUrl) {
    // Fallback to content endpoint
    return downloadFile(itemId);
  }
  const response = await fetch(downloadUrl);
  return response.text();
}

/**
 * Create a new file in the app folder.
 */
export async function createFile(
  name: string,
  content: string
): Promise<OneDriveItem> {
  const response = await graphRequest(`/me/drive/special/approot:/${encodeURIComponent(name)}:/content`, {
    method: 'PUT',
    headers: { 'Content-Type': SIMPLEDOCS_MIME },
    body: content,
  });
  return response.json();
}

/**
 * Update an existing file's content.
 */
export async function updateFile(
  itemId: string,
  content: string
): Promise<OneDriveItem> {
  const response = await graphRequest(`/me/drive/items/${itemId}/content`, {
    method: 'PUT',
    headers: { 'Content-Type': SIMPLEDOCS_MIME },
    body: content,
  });
  return response.json();
}

/**
 * Delete a file.
 */
export async function deleteFile(itemId: string): Promise<void> {
  await graphRequest(`/me/drive/items/${itemId}`, { method: 'DELETE' });
}

/**
 * Rename a file.
 */
export async function renameFile(itemId: string, newName: string): Promise<OneDriveItem> {
  const response = await graphRequest(`/me/drive/items/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newName }),
  });
  return response.json();
}

/**
 * Create a folder in the app folder.
 */
export async function createFolder(name: string): Promise<OneDriveItem> {
  const response = await graphRequest('/me/drive/special/approot/children', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'rename',
    }),
  });
  return response.json();
}

/**
 * Ensure the app folder exists and return it.
 */
export async function getAppFolder(): Promise<OneDriveItem | null> {
  try {
    const response = await graphRequest('/me/drive/special/approot');
    return await response.json();
  } catch {
    return null;
  }
}
