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
  GeneratedImage,
  ImageGenerationOptions,
} from '../../types/chat';
import type { ProviderConfig, LlmProvider } from '../../types/provider';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/** Model ID for single-shot image generation (Nano Banana 2 Lite). */
const GEMINI_IMAGE_MODEL = 'gemini-3.1-flash-lite-image';

/**
 * Filter regex for models we expose in the UI.
 * Keeps the Gemini flash family (text generation) and the
 * flash-lite-image model (Nano Banana). Excludes embedding,
 * imagen, pro-image, and other specialized models.
 */
const GEMINI_MODEL_FILTER = /^gemini-[\d.]+(?:-pro)?-flash(?:-lite(?:-image)?)?$/;

/** Cache key for the models list in localStorage. */
const MODELS_CACHE_KEY = 'SIMPLEDOCS_GEMINI_MODELS_CACHE';

/** Cache TTL — 24 hours in milliseconds. */
const MODELS_CACHE_TTL = 24 * 60 * 60 * 1000;

interface ModelsCacheEntry {
  timestamp: number;
  models: ModelInfo[];
}

/**
 * Supported aspect ratios for gemini-3.1-flash-lite-image.
 * Default is 1:1 (square) at 1K resolution.
 */
const SUPPORTED_ASPECT_RATIOS = [
  '1:1', '1:4', '4:1', '1:8', '8:1',
  '2:3', '3:2', '3:4', '4:3', '4:5', '5:4',
  '9:16', '16:9', '21:9',
];

/**
 * Default model catalog — used as fallback if the live models.list API
 * is unreachable. Text-generation flash family + Nano Banana image model.
 */
const GEMINI_MODELS = [
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', recommended: true },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite' },
  { id: 'gemini-3.1-flash-lite-image', name: 'Gemini 3.1 Flash-Lite Image' },
];

/** Maximum number of retry attempts for transient errors. */
const MAX_RETRIES = 3;

/**
 * HTTP status codes that are transient and worth retrying.
 * 429 = rate limit, 500 = server error, 502 = bad gateway, 503 = unavailable.
 */
function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503;
}

/**
 * Delay before retry attempt n (0-indexed) using exponential backoff.
 * Caps at 8 seconds: 1s, 2s, 4s.
 */
function retryDelay(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, 8000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with automatic retry on transient errors (429, 500, 502, 503).
 * Uses exponential backoff: 1s, 2s, 4s delays between attempts.
 * Throws a user-friendly error on permanent failures or exhausted retries.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = MAX_RETRIES
): Promise<GeminiResponse> {
  let lastStatus = 0;
  let lastErrorText = '';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.ok) {
      return (await response.json()) as GeminiResponse;
    }

    lastStatus = response.status;
    lastErrorText = await response.text();

    // Don't retry permanent errors (400, 401, 403, 404) or if exhausted
    if (!isRetryableStatus(lastStatus) || attempt === maxRetries) {
      throw new Error(parseGeminiApiError(lastStatus, lastErrorText));
    }

    await sleep(retryDelay(attempt));
  }

  // Unreachable — satisfies TypeScript
  throw new Error(parseGeminiApiError(lastStatus, lastErrorText));
}

/**
 * Parse a Gemini API error response into a user-friendly message.
 * The API returns JSON like: {"error":{"code":429,"message":"...","status":"..."}}
 */
function parseGeminiApiError(status: number, errorText: string): string {
  // Try to parse the structured error JSON
  try {
    const parsed = JSON.parse(errorText);
    const detail = parsed.error?.message || parsed.message || parsed.error;
    if (typeof detail === 'string' && detail.length > 0) {
      return formatGeminiErrorMessage(status, detail);
    }
  } catch {
    // Not JSON — fall through to status-based message
  }

  return formatGeminiErrorMessage(status, errorText);
}

/**
 * Map HTTP status + API message to a user-friendly error string.
 */
function formatGeminiErrorMessage(status: number, detail: string): string {
  // Truncate very long detail strings (keep first sentence or 150 chars)
  const trimmed = detail.length > 150 ? `${detail.slice(0, 147)}...` : detail;

  switch (status) {
    case 400:
      return `Bad request: ${trimmed}`;
    case 401:
      return 'Authentication failed. Please check your Google AI Studio API key.';
    case 403:
      return 'Access denied. Your API key may not have permission for this model.';
    case 404:
      return 'Model not found. Please select a different model.';
    case 429:
      return 'Rate limit exceeded. Please wait a moment before trying again.';
    case 500:
      return 'Gemini API server error. Please try again in a moment.';
    case 503:
      return 'Gemini API is temporarily unavailable. Please try again later.';
    default:
      return `Gemini API error (${status}): ${trimmed}`;
  }
}

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
 * Filters to text-generation models + the Nano Banana image model.
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

    // Only return models that:
    //   1. Support generateContent (text generation)
    //   2. Match our allowed model filter (flash family + nano banana)
    return data.models.filter((m) => {
      if (!m.supportedGenerationMethods?.includes('generateContent')) return false;
      const id = resourceNameToId(m.name);
      return GEMINI_MODEL_FILTER.test(id);
    });
  } catch {
    return null;
  }
}

/**
 * Read the models cache from localStorage.
 * Returns null if cache is missing or expired.
 */
function readModelsCache(): ModelInfo[] | null {
  try {
    const raw = localStorage.getItem(MODELS_CACHE_KEY);
    if (!raw) return null;

    const entry: ModelsCacheEntry = JSON.parse(raw);
    const age = Date.now() - entry.timestamp;

    if (age > MODELS_CACHE_TTL) return null;
    if (!Array.isArray(entry.models)) return null;

    return entry.models;
  } catch {
    return null;
  }
}

/**
 * Write the models list to localStorage cache.
 */
function writeModelsCache(models: ModelInfo[]): void {
  try {
    const entry: ModelsCacheEntry = {
      timestamp: Date.now(),
      models,
    };
    localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore cache write failures (private mode, quota, etc.)
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

    // 1. Try cache first (refreshes at most once per day).
    const cached = readModelsCache();
    if (cached) return cached;

    // 2. Query the live models.list API (filtered to text + image models).
    const liveModels = await fetchLiveModels(config.apiKey);
    if (liveModels && liveModels.length > 0) {
      const models = liveModels.map((m) => ({
        id: resourceNameToId(m.name),
        name: m.displayName || resourceNameToId(m.name),
        state: 'unknown' as const,
      }));
      writeModelsCache(models);
      return models;
    }

    // 3. Fallback to hardcoded catalog if API is unreachable.
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

    const data = await fetchWithRetry(
      `${GEMINI_API_BASE}/models/${model}:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(120000),
      }
    );

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response candidates returned from Gemini API');
    }

    return data.candidates[0].content.parts[0].text ?? '';
  },

  async generateImage(
    prompt: string,
    config: ProviderConfig,
    options?: ImageGenerationOptions
  ): Promise<GeneratedImage> {
    if (!isGeminiConfig(config)) {
      throw new Error('Invalid Gemini config: apiKey required');
    }

    // Validate aspect ratio if provided
    if (options?.aspectRatio && !SUPPORTED_ASPECT_RATIOS.includes(options.aspectRatio)) {
      throw new Error(
        `Unsupported aspect ratio "${options.aspectRatio}". Supported: ${SUPPORTED_ASPECT_RATIOS.join(', ')}`
      );
    }

    const generationConfig: Record<string, unknown> = {
      // Must include BOTH TEXT and IMAGE — IMAGE alone returns empty response.
      responseModalities: ['TEXT', 'IMAGE'],
    };

    // Optional image config (aspect ratio + resolution)
    if (options?.aspectRatio || options?.imageSize) {
      const imageConfig: Record<string, string> = {};
      if (options.aspectRatio) imageConfig.aspectRatio = options.aspectRatio;
      if (options.imageSize) imageConfig.imageSize = options.imageSize;
      generationConfig.imageConfig = imageConfig;
    }

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig,
    };

    const data = await fetchWithRetry(
      `${GEMINI_API_BASE}/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(120000),
      }
    );

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response candidates returned from Gemini API');
    }

    // Extract image data and optional caption from response parts
    const parts = data.candidates[0].content.parts;
    let base64: string | undefined;
    let mimeType: string | undefined;
    let caption: string | undefined;

    for (const part of parts) {
      if (part.inlineData) {
        base64 = part.inlineData.data;
        mimeType = part.inlineData.mimeType;
      } else if (part.text) {
        caption = caption ? `${caption}\n${part.text}` : part.text;
      }
    }

    if (!base64 || !mimeType) {
      throw new Error('Gemini image generation returned no image data');
    }

    return { base64, mimeType, caption };
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
