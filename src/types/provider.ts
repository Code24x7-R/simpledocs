// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import type { ChatMessage, ModelInfo } from './chat';

/**
 * Provider configuration types.
 * Each provider has its own config shape.
 */
export interface LmStudioConfig {
  baseUrl: string;
}

export interface GeminiConfig {
  apiKey: string;
}

export type ProviderConfig = LmStudioConfig | GeminiConfig;

/**
 * A user-configured provider instance.
 * Multiple instances of the same provider type can exist
 * (e.g., two different Gemini API keys).
 */
export interface ConfiguredProvider {
  /** Unique instance ID */
  id: string;
  /** Provider type ID ('lmstudio' | 'gemini') */
  providerId: string;
  /** Provider-specific configuration */
  config: ProviderConfig;
  /** Currently selected model ID */
  selectedModel: string;
  /** Whether this is the active provider for chat */
  isActive: boolean;
}

/**
 * Provider definition — the blueprint for creating configured instances.
 * Each provider implements this interface.
 */
export interface LlmProvider {
  /** Unique provider type ID */
  id: string;
  /** Display name */
  name: string;
  /** Lucide icon name */
  icon: string;
  /** Short description for setup UI */
  description: string;
  /** Whether this provider has a free tier */
  hasFreeTier: boolean;

  /**
   * Check if the provider is reachable/authenticated.
   */
  healthcheck(config: ProviderConfig): Promise<boolean>;

  /**
   * List available models for this provider.
   */
  listModels(config: ProviderConfig): Promise<ModelInfo[]>;

  /**
   * Send a chat completion request.
   */
  sendMessage(
    messages: ChatMessage[],
    config: ProviderConfig,
    model: string,
    maxTokens: number,
    temperature: number
  ): Promise<string>;

  /**
   * Get default config for a new instance.
   */
  getDefaultConfig(): ProviderConfig;

  /**
   * Get the default model ID for this provider.
   */
  getDefaultModel(): string;

  /**
   * Validate a configuration object.
   * Returns { valid: true } or { valid: false, error: 'message' }.
   */
  validateConfig(config: ProviderConfig): { valid: boolean; error?: string };

  /**
   * Get available models as a static list.
   * Used by the UI for model selection.
   */
  getAvailableModels(): Array<{ id: string; name: string; recommended?: boolean }>;
}
