// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Google Gemini provider — uses Google AI Studio API key for authentication.
 *
 * API documentation:
 *   https://ai.google.dev/api/generate-content
 *   https://ai.google.dev/api/models
 *
 * Free tier (via AI Studio):
 *   - API key from aistudio.google.com (AIza... or AQ... prefix)
 *   - No credit card required
 *   - Rate limits vary by model
 *
 * Note on Gemini 3.x API changes:
 *   - temperature/top_p/top_k are DEPRECATED — do not send them
 *   - Use thinkingLevel ('minimal' | 'medium' | 'high') instead of thinkingBudget
 *   - candidateCount is unsupported
 */

import type {
  ChatMessage,
  ModelInfo,
  GeminiResponse,
  GeminiContent,
  GeminiModelsResponse,
  GeminiModelEntry,
} from '../../types/chat';
import type { ProviderConfig, LlmProvider } from '../../types/provider';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Default model catalog — used as fallback if the live models.list API
 * is unreachable. These are the Gemini 3 Core Models (GA as of 2026-08).
 */
const GEMINI_MODELS = [
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', recommended: true },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite' },
];

/**
 * Map a model ID to its default thinking level.
 * Flash-Lite variants default to 'minimal' for max throughput.
 * Full Flash variants default to 'medium' for agentic capability.
 */
function defaultThinkingLevel(modelId: string): 'minimal' | 'low' | 'medium' | 'high' {
  if (modelId.includes('lite') || modelId.includes('Lite')) return 'minimal';
  return 'medium';
}

/**
 * Extract model ID from a Gemini resource name.
 * e.g. "models/gemini-3.6-flash" -> "gemini-3.6-flash"
 */
function resourceNameToId(name: string): string {
  return name.startsWith('models/') ? name.slice('models/'.length) : name;
}

/**
 * Fetch available models from the Gemini models.list API.
 * Returns null if the API is unreachable.
 */
async function fetchLiveModels(
  apiKey: string
): Promise<GeminiModelEntry[] | null> {
  try {
    const response = await fetch(`${GEMINI_API_BASE}/models?key=${apiKey}`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const data: GeminiModelsResponse = await response.json();
    if (!data.models || !Array.isArray(data.models)) return null;

    // Only return models that support generateContent
    return data.models.filter((m) =>
      m.supportedGenerationMethods?.includes('generateContent')
    );
  } catch {
    return null;
  }
}

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
        `${GEMINI_API_BASE}/models/gemini-3.6-flash:generateContent?key=${config.apiKey}`,
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

    // Query the live models.list API for models supporting generateContent.
    const liveModels = await fetchLiveModels(config.apiKey);
    if (liveModels && liveModels.length > 0) {
      return liveModels.map((m) => ({
        id: resourceNameToId(m.name),
        name: m.displayName || resourceNameToId(m.name),
        state: 'unknown' as const,
      }));
    }

    // Fallback to hardcoded catalog if API is unreachable.
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
    maxTokens: number,
    _temperature: number
  ): Promise<string> {
    if (!isGeminiConfig(config)) {
      throw new Error('Invalid Gemini config: apiKey required');
    }

    const { contents, systemInstruction } = messagesToGeminiContents(messages);

    const requestBody = {
      contents,
      systemInstruction,
      generationConfig: {
        maxOutputTokens: maxTokens,
        thinkingConfig: {
          thinkingLevel: defaultThinkingLevel(model),
        },
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
    return 'gemini-3.6-flash';
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
