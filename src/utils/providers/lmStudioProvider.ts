// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * LM Studio provider — OpenAI-compatible API.
 *
 * Uses the OpenAI v1 REST API format:
 *   POST /v1/chat/completions    — Chat completion
 *   GET  /v1/models              — List available models
 *   POST /api/v1/models/load     — Load a model into memory
 *   POST /api/v1/models/unload   — Unload a model from memory
 *
 * CORS NOTE: LM Studio must have CORS enabled to accept requests from the
 * browser. Enable in LM Studio: Settings → Enable CORS.
 */

import type { ChatMessage, ModelInfo, ChatCompletionResponse } from '../../types/chat';
import type { ProviderConfig, LlmProvider } from '../../types/provider';

const LM_STUDIO_DEFAULT_BASE_URL = 'http://localhost:1234';

const LM_STUDIO_MODELS = [
  { id: 'google/gemma-4-e2b', name: 'Gemma 4 E2B', recommended: true },
];

function isLmStudioConfig(config: ProviderConfig): config is { baseUrl: string } {
  return typeof (config as { baseUrl: string }).baseUrl === 'string';
}

export const lmStudioProvider: LlmProvider = {
  id: 'lmstudio',
  name: 'LM Studio',
  icon: 'Monitor',
  description: 'Local server with full privacy. No API key required.',
  hasFreeTier: true,

  async healthcheck(config: ProviderConfig): Promise<boolean> {
    const baseUrl = isLmStudioConfig(config) ? config.baseUrl : LM_STUDIO_DEFAULT_BASE_URL;

    try {
      const response = await fetch(`${baseUrl}/v1/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  async listModels(config: ProviderConfig): Promise<ModelInfo[]> {
    const baseUrl = isLmStudioConfig(config) ? config.baseUrl : LM_STUDIO_DEFAULT_BASE_URL;

    const response = await fetch(`${baseUrl}/v1/models`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid models response format');
    }

    return data.data.map((model: { id: string; [key: string]: unknown }) => ({
      id: model.id,
      name: model.id,
      state: 'unknown' as const,
    }));
  },

  async sendMessage(
    messages: ChatMessage[],
    config: ProviderConfig,
    model: string,
    maxTokens: number,
    temperature: number
  ): Promise<string> {
    const baseUrl = isLmStudioConfig(config) ? config.baseUrl : LM_STUDIO_DEFAULT_BASE_URL;

    const requestBody = {
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: maxTokens,
      temperature,
      stream: false,
    };

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      throw new Error(`Chat request failed: ${response.status} ${response.statusText}`);
    }

    const data: ChatCompletionResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response choices returned from API');
    }

    return data.choices[0].message.content;
  },

  getDefaultConfig(): ProviderConfig {
    return { baseUrl: LM_STUDIO_DEFAULT_BASE_URL };
  },

  getDefaultModel(): string {
    return 'google/gemma-4-e2b';
  },

  validateConfig(config: ProviderConfig): { valid: boolean; error?: string } {
    if (!isLmStudioConfig(config)) {
      return { valid: false, error: 'Base URL is required' };
    }
    if (!config.baseUrl.trim()) {
      return { valid: false, error: 'Base URL cannot be empty' };
    }
    try {
      new URL(config.baseUrl);
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }
    return { valid: true };
  },

  getAvailableModels() {
    return LM_STUDIO_MODELS;
  },
};
