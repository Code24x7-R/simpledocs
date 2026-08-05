// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import type { LlmProvider } from '../../types/provider';
import { lmStudioProvider } from './lmStudioProvider';
import { geminiProvider } from './geminiProvider';

/**
 * Registry of all available provider types.
 * Add new providers here to make them available in the UI.
 */
const providers: Record<string, LlmProvider> = {
  lmstudio: lmStudioProvider,
  gemini: geminiProvider,
};

/**
 * Get a provider definition by ID.
 * Returns undefined if not found.
 */
export function getProvider(id: string): LlmProvider | undefined {
  return providers[id];
}

/**
 * Get all available provider definitions.
 */
export function getAllProviders(): LlmProvider[] {
  return Object.values(providers);
}
