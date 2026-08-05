// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Google Gemini provider — uses Google AI Studio API key for authentication.
 *
 * API documentation:
 *   https://ai.google.dev/api/generate-content
 *
 * Free tier (via AI Studio):
 *   - API key starts with "AIza..."
 *   - No credit card required
 *   - Rate limits: ~10-15 requests per minute for Flash models
 *   - Prompts may be reviewed by Google for training
 */

import type { ChatMessage, ModelInfo, GeminiResponse, GeminiContent } from '../../types/chat';
import type { ProviderConfig, LlmProvider } from '../../types/provider';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const GEMINI_MODELS = [
  { id: 'gemini-3.6-flash-preview', name: 'Gemini 3.6 Flash', recommended: true },
  { id: 'gemini-3.5-flash-preview', name: 'Gemini 3.5 Flash' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite' },
];

function isGeminiConfig(config: ProviderConfig): config is { apiKey: string } {
  return typeof (config as { apiKey: string }).apiKey === 'string';
}

/**
 * Convert ChatMessage[] to Gemini contents[] format.
 * Gemini uses 'user' and 'model' roles (not 'assistant').
 * System messages become systemInstruction.
 */
function messagesToGeminiContents(messages: ChatMessage[]): {
  contents: GeminiContent[];
  systemInstruction?: { parts: { text: string }[] };
} {
  const contents: GeminiContent[] = [];
  let systemText = '';

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemText += (systemText ? '\n\n' : '') + msg.content;
      continue;
    }

    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    });
  }

  const result: { contents: GeminiContent[]; systemInstruction?: { parts: { text: string }[] } } = {
    contents,
  };

  if (systemText) {
    result.systemInstruction = { parts: [{ text: systemText }] };
  }

  return result;
}

export const geminiProvider: LlmProvider = {
  id: 'gemini',
  name: 'Google Gemini',
  icon: 'Sparkles',
  description: 'Cloud API with free tier. Requires a Google AI Studio API key.',
  hasFreeTier: true,

  async healthcheck(config: ProviderConfig): Promise<boolean> {
    if (!isGeminiConfig(config)) return false;

    try {
      const response = await fetch(
        `${GEMINI_API_BASE}/models/gemini-3.6-flash-preview:generateContent?key=${config.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
            generationConfig: { maxOutputTokens: 1 },
          }),
          signal: AbortSignal.timeout(10000),
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  },

  async listModels(config: ProviderConfig): Promise<ModelInfo[]> {
    if (!isGeminiConfig(config)) return [];

    // Gemini doesn't have a free model-list endpoint without project setup.
    // Return hardcoded list of common free-tier models.
    return GEMINI_MODELS.map((m) => ({
      id: m.id,
      name: m.name,
      state: 'unknown' as const,
    }));
  },

  async sendMessage(
    messages: ChatMessage[],
    config: ProviderConfig,
    model: string,
    _maxTokens: number,
    temperature: number
  ): Promise<string> {
    if (!isGeminiConfig(config)) {
      throw new Error('Invalid Gemini config: apiKey required');
    }

    const { contents, systemInstruction } = messagesToGeminiContents(messages);

    const requestBody = {
      contents,
      systemInstruction,
      generationConfig: {
        temperature,
        maxOutputTokens: 8192,
      },
    };

    const response = await fetch(
      `${GEMINI_API_BASE}/models/${model}:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(120000),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} — ${errorText}`);
    }

    const data: GeminiResponse = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response candidates returned from Gemini API');
    }

    return data.candidates[0].content.parts[0].text;
  },

  getDefaultConfig(): ProviderConfig {
    return { apiKey: '' };
  },

  getDefaultModel(): string {
    return 'gemini-3.6-flash-preview';
  },

  validateConfig(config: ProviderConfig): { valid: boolean; error?: string } {
    if (!isGeminiConfig(config)) {
      return { valid: false, error: 'API key is required' };
    }
    if (!config.apiKey.trim()) {
      return { valid: false, error: 'API key cannot be empty' };
    }
    if (config.apiKey.trim().length < 10) {
      return { valid: false, error: 'API key is too short' };
    }
    return { valid: true };
  },

  getAvailableModels() {
    return GEMINI_MODELS;
  },
};
