// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * LM Studio client — OpenAI-compatible API.
 *
 * Uses the OpenAI v1 REST API format (also supported by LM Studio):
 *   POST /v1/chat/completions    — Chat completion (OpenAI-compatible)
 *   GET  /v1/models              — List available models (OpenAI-compatible)
 *   POST /api/v1/models/load     — Load a model into memory (LM Studio native)
 *   POST /api/v1/models/unload   — Unload a model from memory (LM Studio native)
 *   POST /api/v1/models/download — Download a model (LM Studio native)
 *   GET  /api/v1/models/download/status — Download status (LM Studio native)
 *
 * CORS NOTE: LM Studio must have CORS enabled to accept requests from the
 * browser. Enable in LM Studio: Settings → Enable CORS.
 */

import type {
  ChatConfig,
  ChatMessage,
  ChatCompletionResponse,
  ModelInfo,
  ApiError,
} from '../types/chat';

const DEFAULT_BASE_URL = 'http://localhost:1234';
const DEFAULT_MODEL = 'google/gemma-4-e2b';
const DEFAULT_MAX_TOKENS = 65535;
const DEFAULT_TEMPERATURE = 0.7;

/**
 * Create a structured API error from a fetch failure.
 */
function createApiError(message: string, status?: number): ApiError {
  return { message, status };
}

/**
 * Healthcheck — verify LM Studio server is reachable.
 * Returns true if the server responds to GET /v1/models (OpenAI-compatible).
 */
export async function healthcheck(baseUrl: string = DEFAULT_BASE_URL): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/v1/models`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * List available models using OpenAI-compatible endpoint.
 * Returns array of ModelInfo with id, name, and state.
 *
 * Note: The OpenAI-compatible /v1/models endpoint doesn't return model
 * load state, so all models are reported as 'unknown' state.
 * Use the native /api/v1/models endpoint for load state info.
 */
export async function listModels(baseUrl: string = DEFAULT_BASE_URL): Promise<ModelInfo[]> {
  const response = await fetch(`${baseUrl}/v1/models`, {
    method: 'GET',
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw createApiError(
      `Failed to list models: ${response.status} ${response.statusText}`,
      response.status
    );
  }

  const data = await response.json();

  // OpenAI-compatible format: { object: 'list', data: [{ id, object, created, owned_by }] }
  if (!data.data || !Array.isArray(data.data)) {
    throw createApiError('Invalid models response format');
  }

  return data.data.map((model: { id: string; [key: string]: unknown }) => ({
    id: model.id,
    name: model.id,
    state: 'unknown' as const, // OpenAI endpoint doesn't expose load state
  }));
}

/**
 * Load a model into memory.
 */
export async function loadModel(
  modelId: string,
  baseUrl: string = DEFAULT_BASE_URL
): Promise<void> {
  const response = await fetch(`${baseUrl}/api/v1/models/load`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modelId }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw createApiError(
      `Failed to load model "${modelId}": ${response.status} ${response.statusText}`,
      response.status
    );
  }
}

/**
 * Unload a model from memory.
 */
export async function unloadModel(
  modelId: string,
  baseUrl: string = DEFAULT_BASE_URL
): Promise<void> {
  const response = await fetch(`${baseUrl}/api/v1/models/unload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modelId }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw createApiError(
      `Failed to unload model "${modelId}": ${response.status} ${response.statusText}`,
      response.status
    );
  }
}

/**
 * Send a chat completion request using OpenAI-compatible endpoint.
 *
 * Uses POST /v1/chat/completions which is the standard OpenAI API format
 * supported by LM Studio, Ollama, and other local LLM servers.
 *
 * @param messages — Full conversation history including system prompt
 * @param config — Chat configuration (baseUrl, model, maxTokens, temperature)
 * @returns The assistant's response text
 */
export async function sendMessage(
  messages: ChatMessage[],
  config: Partial<ChatConfig> = {}
): Promise<string> {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const model = config.model ?? DEFAULT_MODEL;
  const maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;
  const temperature = config.temperature ?? DEFAULT_TEMPERATURE;

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
    signal: AbortSignal.timeout(120000), // 2 min timeout for generation
  });

  if (!response.ok) {
    throw createApiError(
      `Chat request failed: ${response.status} ${response.statusText}`,
      response.status
    );
  }

  const data: ChatCompletionResponse = await response.json();

  if (!data.choices || data.choices.length === 0) {
    throw createApiError('No response choices returned from API');
  }

  return data.choices[0].message.content;
}

export { DEFAULT_BASE_URL, DEFAULT_MODEL, DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE };
