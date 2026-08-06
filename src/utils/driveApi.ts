// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Google Drive API v3 wrapper.
 *
 * Provides CRUD operations for documents stored in Google Drive.
 * All functions require a valid access token (from driveAuth.ts).
 */

import { requestAccessToken } from './driveAuth';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API_BASE = 'https://www.googleapis.com/upload/drive/v3';

/** MIME type for SimpleDocs JSON files. */
export const SIMPLEDOCS_MIME = 'application/vnd.simpledocs+json';

/** MIME type for Google Drive folder. */
export const FOLDER_MIME = 'application/vnd.google-apps.folder';

/** A file metadata entry from Drive. */
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  size?: string;
  parents?: string[];
}

/** Response from files.list endpoint. */
interface DriveFileListResponse {
  files: DriveFile[];
  nextPageToken?: string;
}

/**
 * Make an authenticated request to the Drive API.
 * Automatically obtains an access token if needed.
 */
async function driveRequest(
  path: string,
  options: RequestInit = {},
  apiBase: string = DRIVE_API_BASE
): Promise<Response> {
  const token = await requestAccessToken();
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Drive API error (${response.status}): ${errorText}`);
  }

  return response;
}

/**
 * List SimpleDocs files in Drive.
 * Optionally filter by parent folder.
 */
export async function listFiles(parentId?: string): Promise<DriveFile[]> {
  const query = [`mimeType='${SIMPLEDOCS_MIME}'`, 'trashed=false'];
  if (parentId) {
    query.push(`'${parentId}' in parents`);
  }

  const params = new URLSearchParams({
    q: query.join(' and '),
    fields: 'files(id,name,mimeType,createdTime,modifiedTime,size,parents)',
    orderBy: 'modifiedTime desc',
    pageSize: '50',
  });

  const response = await driveRequest(`/files?${params}`);
  const data: DriveFileListResponse = await response.json();
  return data.files;
}

/**
 * List folders in Drive.
 */
export async function listFolders(): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    q: `mimeType='${FOLDER_MIME}' and trashed=false`,
    fields: 'files(id,name,createdTime,modifiedTime)',
    orderBy: 'name',
    pageSize: '50',
  });

  const response = await driveRequest(`/files?${params}`);
  const data: DriveFileListResponse = await response.json();
  return data.files;
}

/**
 * Get file metadata by ID.
 */
export async function getFileMetadata(fileId: string): Promise<DriveFile> {
  const params = new URLSearchParams({
    fields: 'id,name,mimeType,createdTime,modifiedTime,size,parents',
  });

  const response = await driveRequest(`/files/${fileId}?${params}`);
  return response.json();
}

/**
 * Download file content as text.
 */
export async function downloadFile(fileId: string): Promise<string> {
  const params = new URLSearchParams({ alt: 'media' });
  const response = await driveRequest(`/files/${fileId}?${params}`);
  return response.text();
}

/**
 * Create a new file in Drive.
 * @param name - File name (e.g., "My Document.sdjson")
 * @param content - JSON string to save
 * @param parentId - Optional folder ID
 * @returns The created file metadata
 */
export async function createFile(
  name: string,
  content: string,
  parentId?: string
): Promise<DriveFile> {
  // Metadata part (multipart upload)
  const metadata: Record<string, unknown> = {
    name,
    mimeType: SIMPLEDOCS_MIME,
  };
  if (parentId) {
    metadata.parents = [parentId];
  }

  // Build multipart request body
  const boundary = '-------simpledocs_boundary';
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    content,
    `--${boundary}--`,
    '',
  ].join('\r\n');

  const token = await requestAccessToken();
  const response = await fetch(`${UPLOAD_API_BASE}/files?uploadType=multipart&fields=id,name,mimeType,createdTime,modifiedTime,size,parents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Drive upload error (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Update an existing file's content.
 */
export async function updateFile(fileId: string, content: string): Promise<DriveFile> {
  const token = await requestAccessToken();
  const response = await fetch(`${UPLOAD_API_BASE}/files/${fileId}?uploadType=media&fields=id,name,mimeType,modifiedTime`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: content,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Drive update error (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Create a folder in Drive.
 */
export async function createFolder(name: string, parentId?: string): Promise<DriveFile> {
  const metadata: Record<string, unknown> = {
    name,
    mimeType: FOLDER_MIME,
  };
  if (parentId) {
    metadata.parents = [parentId];
  }

  const response = await driveRequest('/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metadata),
  });

  return response.json();
}

/**
 * Delete a file (move to trash).
 */
export async function deleteFile(fileId: string): Promise<void> {
  await driveRequest(`/files/${fileId}`, { method: 'DELETE' });
}

/**
 * Rename a file.
 */
export async function renameFile(fileId: string, newName: string): Promise<DriveFile> {
  const response = await driveRequest(`/files/${fileId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newName }),
  });

  return response.json();
}
