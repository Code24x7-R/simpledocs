// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson

/**
 * Chat types for LM Studio integration.
 *
 * Uses OpenAI-compatible API endpoints (also supported by LM Studio):
 *   POST /v1/chat/completions   — Chat completion (OpenAI-compatible)
 *   GET  /v1/models             — List available models (OpenAI-compatible)
 *
 * LM Studio native endpoints (for model management):
 *   POST /api/v1/models/load    — Load a model into memory
 *   POST /api/v1/models/unload  — Unload a model from memory
 *   POST /api/v1/models/download — Download a model
 *   GET  /api/v1/models/download/status — Download status
 *
 * NOTE: LM Studio must have CORS enabled to accept requests from the
 * Vite dev server (http://localhost:5173). Enable in LM Studio settings:
 *   Settings → Enable CORS
 */

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  timestamp: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  state: 'loaded' | 'unloaded' | 'unknown';
}

export interface ChatConfig {
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

// ─── API Request/Response Types ────────────────────────────────────────────

export interface ChatCompletionMessage {
  role: ChatRole;
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatCompletionMessage[];
  max_tokens: number;
  temperature: number;
  stream: boolean;
}

export interface ChatCompletionChoice {
  message: ChatCompletionMessage;
  finish_reason: string;
  index: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI-compatible models list response.
 * Format: { object: 'list', data: [{ id, object, created, owned_by }] }
 */
export interface OpenAiModelsResponse {
  data: Array<{
    id: string;
    object: string;
    created?: number;
    owned_by?: string;
  }>;
  object: string;
}

/**
 * LM Studio native models list response (includes model state).
 * Format: { object: 'list', data: [{ id, object, state, ... }] }
 */
export interface LmStudioModelsResponse {
  data: Array<{
    id: string;
    object: string;
    type?: string;
    publisher?: string;
    arch?: string;
    compatibility_type?: string;
    quantization?: string;
    state?: string;
    max_context_length?: number;
  }>;
  object: string;
}

/** Union type for models response from either endpoint. */
export type ModelsResponse = OpenAiModelsResponse | LmStudioModelsResponse;

export interface LoadModelRequest {
  modelId: string;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

// ─── Gemini API Types ──────────────────────────────────────────────────────────

export interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface GeminiContent {
  role: string;
  parts: GeminiPart[];
}

export interface GeminiSystemInstruction {
  parts: GeminiPart[];
}

export interface GeminiThinkingConfig {
  thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
}

export interface GeminiGenerationConfig {
  maxOutputTokens?: number;
  thinkingConfig?: GeminiThinkingConfig;
}

export interface GeminiRequest {
  contents: GeminiContent[];
  systemInstruction?: GeminiSystemInstruction;
  generationConfig?: GeminiGenerationConfig;
}

export interface GeminiCandidate {
  content: {
    role: string;
    parts: GeminiPart[];
  };
  finishReason: string;
}

export interface GeminiResponse {
  candidates: GeminiCandidate[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

// ─── Gemini Models.list API Types ────────────────────────────────────────────

export interface GeminiModelEntry {
  name: string;
  displayName?: string;
  description?: string;
  supportedGenerationMethods?: string[];
  inputTokenLimit?: number;
  outputTokenLimit?: number;
}

export interface GeminiModelsResponse {
  models: GeminiModelEntry[];
  nextPageToken?: string;
}

// ─── Image Generation Types ──────────────────────────────────────────────────

export interface GeneratedImage {
  /** Raw base64-encoded image bytes (no data URI prefix). */
  base64: string;
  /** MIME type of the generated image (e.g. 'image/png'). */
  mimeType: string;
  /** Optional text caption returned alongside the image. */
  caption?: string;
}

export interface ImageGenerationOptions {
  /** Aspect ratio of the generated image (e.g. '1:1', '16:9', '9:16'). */
  aspectRatio?: string;
  /** Image resolution — '1K' for gemini-3.1-flash-lite-image. */
  imageSize?: string;
}
