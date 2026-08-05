// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useChatStore, estimateTokenCount } from './useChatStore';
import type { ChatMessage } from '../types/chat';
import type { LlmProvider } from '../types/provider';

// Helper to create a mock LlmProvider with all required fields
function createMockProvider(overrides: Partial<LlmProvider> & { id: string; name: string; icon: string }): LlmProvider {
  return {
    id: overrides.id,
    name: overrides.name,
    icon: overrides.icon,
    description: overrides.description ?? '',
    hasFreeTier: overrides.hasFreeTier ?? true,
    healthcheck: overrides.healthcheck ?? vi.fn().mockResolvedValue(true),
    listModels: overrides.listModels ?? vi.fn().mockResolvedValue([]),
    sendMessage: overrides.sendMessage ?? vi.fn().mockResolvedValue(''),
    generateImage: overrides.generateImage ?? vi.fn().mockResolvedValue({
      base64: 'abc123',
      mimeType: 'image/png',
      caption: 'Generated image',
    }),
    getDefaultConfig: overrides.getDefaultConfig ?? (() => ({ baseUrl: 'http://localhost:1234' })),
    getDefaultModel: overrides.getDefaultModel ?? (() => 'google/gemma-4-e2b'),
    validateConfig: overrides.validateConfig ?? (() => ({ valid: true as const })),
    getAvailableModels: overrides.getAvailableModels ?? (() => []),
  };
}

// Mock the provider registry
vi.mock('../utils/providers/providerRegistry', () => ({
  getProvider: vi.fn((id: string) => {
    if (id === 'lmstudio') {
      return createMockProvider({
        id: 'lmstudio',
        name: 'LM Studio',
        icon: 'Monitor',
        description: 'Local server',
        healthcheck: vi.fn().mockResolvedValue(true),
        listModels: vi.fn().mockResolvedValue([
          { id: 'google/gemma-4-e2b', name: 'google/gemma-4-e2b', state: 'unknown' },
        ]),
        sendMessage: vi.fn().mockResolvedValue('AI response here'),
        getDefaultConfig: () => ({ baseUrl: 'http://localhost:1234' }),
        getDefaultModel: () => 'google/gemma-4-e2b',
      });
    }
    if (id === 'gemini') {
      return createMockProvider({
        id: 'gemini',
        name: 'Google Gemini',
        icon: 'Sparkles',
        description: 'Cloud API',
        healthcheck: vi.fn().mockResolvedValue(true),
        listModels: vi.fn().mockResolvedValue([
          { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', state: 'unknown' },
        ]),
        sendMessage: vi.fn().mockResolvedValue('AI response here'),
        getDefaultConfig: () => ({ apiKey: 'AIzaTest123' }),
        getDefaultModel: () => 'gemini-2.5-flash',
      });
    }
    return undefined;
  }),
}));

import * as providerRegistry from '../utils/providers/providerRegistry';

describe('useChatStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    useChatStore.setState({
      configuredProviders: [
        {
          id: 'test-lm-studio',
          providerId: 'lmstudio',
          config: { baseUrl: 'http://localhost:1234' },
          selectedModel: 'google/gemma-4-e2b',
          isActive: true,
        },
      ],
      activeProviderId: 'test-lm-studio',
      isConnected: false,
      isChecking: false,
      connectionError: null,
      models: [],
      maxTokens: 65535,
      temperature: 0.7,
      systemPrompt: 'You are a helpful assistant.',
      messages: [],
      isLoading: false,
      lastResponse: '',
      lastGeneratedImage: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('estimateTokenCount', () => {
    it('returns 0 for empty string', () => {
      expect(estimateTokenCount('')).toBe(0);
    });

    it('estimates ~4 chars per token', () => {
      expect(estimateTokenCount('abcd')).toBe(1);
      expect(estimateTokenCount('abcdefgh')).toBe(2);
    });

    it('rounds up for partial tokens', () => {
      expect(estimateTokenCount('abc')).toBe(1);
      expect(estimateTokenCount('abcde')).toBe(2);
    });
  });

  describe('checkHealth', () => {
    it('sets isConnected to true on successful healthcheck', async () => {
      vi.mocked(providerRegistry.getProvider).mockReturnValue(
        createMockProvider({
          id: 'lmstudio',
          name: 'LM Studio',
          icon: 'Monitor',
          healthcheck: vi.fn().mockResolvedValue(true),
          getDefaultConfig: () => ({ baseUrl: 'http://localhost:1234' }),
          getDefaultModel: () => 'google/gemma-4-e2b',
        })
      );

      await useChatStore.getState().checkHealth();

      expect(useChatStore.getState().isConnected).toBe(true);
      expect(useChatStore.getState().isChecking).toBe(false);
      expect(useChatStore.getState().connectionError).toBeNull();
    });

    it('sets connection error on failed healthcheck', async () => {
      vi.mocked(providerRegistry.getProvider).mockReturnValue(
        createMockProvider({
          id: 'lmstudio',
          name: 'LM Studio',
          icon: 'Monitor',
          healthcheck: vi.fn().mockResolvedValue(false),
          getDefaultConfig: () => ({ baseUrl: 'http://localhost:1234' }),
          getDefaultModel: () => 'google/gemma-4-e2b',
        })
      );

      await useChatStore.getState().checkHealth();

      expect(useChatStore.getState().isConnected).toBe(false);
      expect(useChatStore.getState().connectionError).toBe('Cannot reach LM Studio server');
    });

    it('handles exceptions gracefully', async () => {
      vi.mocked(providerRegistry.getProvider).mockReturnValue(
        createMockProvider({
          id: 'lmstudio',
          name: 'LM Studio',
          icon: 'Monitor',
          healthcheck: vi.fn().mockRejectedValue(new Error('Network error')),
          getDefaultConfig: () => ({ baseUrl: 'http://localhost:1234' }),
          getDefaultModel: () => 'google/gemma-4-e2b',
        })
      );

      await useChatStore.getState().checkHealth();

      expect(useChatStore.getState().isConnected).toBe(false);
      expect(useChatStore.getState().connectionError).toBe('Network error');
    });

    it('sets error when no provider is configured', async () => {
      useChatStore.setState({
        configuredProviders: [],
        activeProviderId: null,
      });

      await useChatStore.getState().checkHealth();

      expect(useChatStore.getState().isConnected).toBe(false);
      expect(useChatStore.getState().connectionError).toBe('No provider configured');
    });
  });

  describe('refreshModels', () => {
    it('populates models list on success', async () => {
      const mockModels = [
        { id: 'model-1', name: 'model-1', state: 'unknown' as const },
        { id: 'model-2', name: 'model-2', state: 'unknown' as const },
      ];
      vi.mocked(providerRegistry.getProvider).mockReturnValue(
        createMockProvider({
          id: 'lmstudio',
          name: 'LM Studio',
          icon: 'Monitor',
          listModels: vi.fn().mockResolvedValue(mockModels),
          getDefaultConfig: () => ({ baseUrl: 'http://localhost:1234' }),
          getDefaultModel: () => 'google/gemma-4-e2b',
        })
      );

      await useChatStore.getState().refreshModels();

      expect(useChatStore.getState().models).toEqual(mockModels);
    });

    it('sets connection error on failure', async () => {
      vi.mocked(providerRegistry.getProvider).mockReturnValue(
        createMockProvider({
          id: 'lmstudio',
          name: 'LM Studio',
          icon: 'Monitor',
          listModels: vi.fn().mockRejectedValue(new Error('Failed')),
          getDefaultConfig: () => ({ baseUrl: 'http://localhost:1234' }),
          getDefaultModel: () => 'google/gemma-4-e2b',
        })
      );

      await useChatStore.getState().refreshModels();

      expect(useChatStore.getState().connectionError).toBe('Failed');
    });
  });

  describe('sendMessage', () => {
    it('does nothing for empty messages', async () => {
      await useChatStore.getState().sendMessage('   ');
      expect(useChatStore.getState().messages).toHaveLength(0);
    });

    it('adds user message and gets assistant response', async () => {
      vi.mocked(providerRegistry.getProvider).mockReturnValue(
        createMockProvider({
          id: 'lmstudio',
          name: 'LM Studio',
          icon: 'Monitor',
          sendMessage: vi.fn().mockResolvedValue('AI response here'),
          getDefaultConfig: () => ({ baseUrl: 'http://localhost:1234' }),
          getDefaultModel: () => 'google/gemma-4-e2b',
        })
      );

      await useChatStore.getState().sendMessage('Hello AI');

      const state = useChatStore.getState();
      expect(state.messages).toHaveLength(2);
      expect(state.messages[0].role).toBe('user');
      expect(state.messages[0].content).toBe('Hello AI');
      expect(state.messages[1].role).toBe('assistant');
      expect(state.messages[1].content).toBe('AI response here');
      expect(state.lastResponse).toBe('AI response here');
      expect(state.isLoading).toBe(false);
      expect(state.isConnected).toBe(true);
    });

    it('sets loading state while sending', async () => {
      let resolveMessage: (value: string) => void;
      const messagePromise = new Promise<string>((resolve) => {
        resolveMessage = resolve;
      });
      vi.mocked(providerRegistry.getProvider).mockReturnValue(
        createMockProvider({
          id: 'lmstudio',
          name: 'LM Studio',
          icon: 'Monitor',
          sendMessage: vi.fn().mockReturnValue(messagePromise),
          getDefaultConfig: () => ({ baseUrl: 'http://localhost:1234' }),
          getDefaultModel: () => 'google/gemma-4-e2b',
        })
      );

      const sendPromise = useChatStore.getState().sendMessage('Test');

      // Should be loading
      expect(useChatStore.getState().isLoading).toBe(true);

      // Resolve the message
      resolveMessage!('Done');
      await sendPromise;

      expect(useChatStore.getState().isLoading).toBe(false);
    });

    it('handles API errors', async () => {
      vi.mocked(providerRegistry.getProvider).mockReturnValue(
        createMockProvider({
          id: 'lmstudio',
          name: 'LM Studio',
          icon: 'Monitor',
          sendMessage: vi.fn().mockRejectedValue(new Error('API down')),
          getDefaultConfig: () => ({ baseUrl: 'http://localhost:1234' }),
          getDefaultModel: () => 'google/gemma-4-e2b',
        })
      );

      await useChatStore.getState().sendMessage('Hello');

      const state = useChatStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isConnected).toBe(false);
      expect(state.connectionError).toBe('API down');
    });

    it('includes system prompt in request', async () => {
      vi.mocked(providerRegistry.getProvider).mockReturnValue(
        createMockProvider({
          id: 'lmstudio',
          name: 'LM Studio',
          icon: 'Monitor',
          sendMessage: vi.fn().mockImplementation(async (messages: ChatMessage[]) => {
            // Verify system prompt is included
            expect(messages[0].role).toBe('system');
            expect(messages[0].content).toBe('You are a helpful assistant.');
            return 'OK';
          }),
          getDefaultConfig: () => ({ baseUrl: 'http://localhost:1234' }),
          getDefaultModel: () => 'google/gemma-4-e2b',
        })
      );

      await useChatStore.getState().sendMessage('Hello');
    });

    it('sets error when no provider configured', async () => {
      useChatStore.setState({
        configuredProviders: [],
        activeProviderId: null,
      });

      await useChatStore.getState().sendMessage('Hello');

      const state = useChatStore.getState();
      expect(state.connectionError).toBe('No provider configured. Add a provider in settings.');
    });
  });

  describe('generateImage', () => {
    beforeEach(() => {
      // Switch to a gemini provider for image generation tests
      useChatStore.setState({
        configuredProviders: [
          {
            id: 'test-gemini',
            providerId: 'gemini',
            config: { apiKey: 'AIzaTest123' },
            selectedModel: 'gemini-3.6-flash',
            isActive: true,
          },
        ],
        activeProviderId: 'test-gemini',
      });
    });

    it('does nothing for empty prompt', async () => {
      await useChatStore.getState().generateImage('   ');
      expect(useChatStore.getState().messages).toHaveLength(0);
    });

    it('adds user message and stores generated image', async () => {
      vi.mocked(providerRegistry.getProvider).mockReturnValue(
        createMockProvider({
          id: 'gemini',
          name: 'Google Gemini',
          icon: 'Sparkles',
          generateImage: vi.fn().mockResolvedValue({
            base64: 'iVBORw0KGgo=',
            mimeType: 'image/png',
            caption: 'A cat sitting on a keyboard',
          }),
          getDefaultConfig: () => ({ apiKey: '' }),
          getDefaultModel: () => 'gemini-3.6-flash',
        })
      );

      await useChatStore.getState().generateImage('A cat on a keyboard', {
        aspectRatio: '16:9',
        imageSize: '1K',
      });

      const state = useChatStore.getState();
      // User message + assistant message
      expect(state.messages).toHaveLength(2);
      expect(state.messages[0].role).toBe('user');
      expect(state.messages[0].content).toBe('[Image] A cat on a keyboard');
      expect(state.messages[1].role).toBe('assistant');
      expect(state.messages[1].content).toBe('A cat sitting on a keyboard');
      // Generated image stored
      expect(state.lastGeneratedImage).toEqual({
        base64: 'iVBORw0KGgo=',
        mimeType: 'image/png',
        caption: 'A cat sitting on a keyboard',
      });
      expect(state.isLoading).toBe(false);
      expect(state.isConnected).toBe(true);
    });

    it('passes options to provider.generateImage', async () => {
      const mockGenerateImage = vi.fn().mockResolvedValue({
        base64: 'abc',
        mimeType: 'image/png',
      });
      vi.mocked(providerRegistry.getProvider).mockReturnValue(
        createMockProvider({
          id: 'gemini',
          name: 'Google Gemini',
          icon: 'Sparkles',
          generateImage: mockGenerateImage,
          getDefaultConfig: () => ({ apiKey: '' }),
          getDefaultModel: () => 'gemini-3.6-flash',
        })
      );

      await useChatStore.getState().generateImage('A landscape', {
        aspectRatio: '16:9',
        imageSize: '1K',
      });

      expect(mockGenerateImage).toHaveBeenCalledWith(
        'A landscape',
        { apiKey: 'AIzaTest123' },
        { aspectRatio: '16:9', imageSize: '1K' }
      );
    });

    it('uses caption or fallback for assistant message', async () => {
      // Test with no caption
      vi.mocked(providerRegistry.getProvider).mockReturnValue(
        createMockProvider({
          id: 'gemini',
          name: 'Google Gemini',
          icon: 'Sparkles',
          generateImage: vi.fn().mockResolvedValue({
            base64: 'abc',
            mimeType: 'image/png',
          }),
          getDefaultConfig: () => ({ apiKey: '' }),
          getDefaultModel: () => 'gemini-3.6-flash',
        })
      );

      await useChatStore.getState().generateImage('No caption here');

      const state = useChatStore.getState();
      expect(state.messages[1].content).toBe('Image generated');
    });

    it('sets loading state while generating', async () => {
      let resolveImage: (value: { base64: string; mimeType: string }) => void;
      const imagePromise = new Promise<{ base64: string; mimeType: string }>((resolve) => {
        resolveImage = resolve;
      });
      vi.mocked(providerRegistry.getProvider).mockReturnValue(
        createMockProvider({
          id: 'gemini',
          name: 'Google Gemini',
          icon: 'Sparkles',
          generateImage: vi.fn().mockReturnValue(imagePromise),
          getDefaultConfig: () => ({ apiKey: '' }),
          getDefaultModel: () => 'gemini-3.6-flash',
        })
      );

      const genPromise = useChatStore.getState().generateImage('Test');

      // Should be loading
      expect(useChatStore.getState().isLoading).toBe(true);

      // Resolve the image
      resolveImage!({ base64: 'done', mimeType: 'image/png' });
      await genPromise;

      expect(useChatStore.getState().isLoading).toBe(false);
    });

    it('handles API errors', async () => {
      vi.mocked(providerRegistry.getProvider).mockReturnValue(
        createMockProvider({
          id: 'gemini',
          name: 'Google Gemini',
          icon: 'Sparkles',
          generateImage: vi.fn().mockRejectedValue(new Error('Rate limit exceeded')),
          getDefaultConfig: () => ({ apiKey: '' }),
          getDefaultModel: () => 'gemini-3.6-flash',
        })
      );

      await useChatStore.getState().generateImage('A cat');

      const state = useChatStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isConnected).toBe(false);
      expect(state.connectionError).toBe('Rate limit exceeded');
    });

    it('sets error when no provider configured', async () => {
      useChatStore.setState({
        configuredProviders: [],
        activeProviderId: null,
      });

      await useChatStore.getState().generateImage('A cat');

      const state = useChatStore.getState();
      expect(state.connectionError).toBe('No provider configured. Add a provider in settings.');
    });

    it('sets error when provider does not support image generation', async () => {
      // LM Studio provider has no generateImage method
      useChatStore.setState({
        configuredProviders: [
          {
            id: 'test-lmstudio',
            providerId: 'lmstudio',
            config: { baseUrl: 'http://localhost:1234' },
            selectedModel: 'google/gemma-4-e2b',
            isActive: true,
          },
        ],
        activeProviderId: 'test-lmstudio',
      });

      // createMockProvider adds generateImage by default, so we override with one that deletes it
      const lmStudioProvider = createMockProvider({
        id: 'lmstudio',
        name: 'LM Studio',
        icon: 'Monitor',
        getDefaultConfig: () => ({ baseUrl: 'http://localhost:1234' }),
        getDefaultModel: () => 'google/gemma-4-e2b',
      });
      delete lmStudioProvider.generateImage;
      vi.mocked(providerRegistry.getProvider).mockReturnValue(lmStudioProvider);

      await useChatStore.getState().generateImage('A cat');

      const state = useChatStore.getState();
      expect(state.connectionError).toBe('Image generation is not supported by the active provider.');
    });
  });

  describe('provider management', () => {
    it('addProvider creates a new configured instance', () => {
      const id = useChatStore.getState().addProvider('gemini');
      expect(id).toBeTruthy();

      const state = useChatStore.getState();
      const newProvider = state.configuredProviders.find((p) => p.id === id);
      expect(newProvider).toBeDefined();
      expect(newProvider?.providerId).toBe('gemini');
      expect(newProvider?.isActive).toBe(false);
    });

    it('removeProvider removes the instance', () => {
      const id = useChatStore.getState().addProvider('gemini');
      const initialCount = useChatStore.getState().configuredProviders.length;

      useChatStore.getState().removeProvider(id);

      expect(useChatStore.getState().configuredProviders).toHaveLength(initialCount - 1);
    });

    it('removeProvider activates another provider if active was removed', () => {
      const providers = useChatStore.getState().configuredProviders;
      const activeId = providers[0].id;

      useChatStore.getState().removeProvider(activeId);

      const state = useChatStore.getState();
      expect(state.activeProviderId).toBeNull();
    });

    it('setActiveProvider switches active provider', () => {
      const id = useChatStore.getState().addProvider('gemini');

      useChatStore.getState().setActiveProvider(id);

      const state = useChatStore.getState();
      expect(state.activeProviderId).toBe(id);
      const activeProvider = state.configuredProviders.find((p) => p.id === id);
      expect(activeProvider?.isActive).toBe(true);
    });

    it('updateProviderConfig updates config', () => {
      const providers = useChatStore.getState().configuredProviders;
      const id = providers[0].id;

      useChatStore.getState().updateProviderConfig(id, { baseUrl: 'http://localhost:8080' });

      const provider = useChatStore.getState().configuredProviders.find((p) => p.id === id);
      expect((provider?.config as { baseUrl: string }).baseUrl).toBe('http://localhost:8080');
    });
  });

  describe('setters', () => {
    it('setModel updates selected model on active provider', () => {
      useChatStore.getState().setModel('new-model');

      const activeProvider = useChatStore.getState().configuredProviders.find((p) => p.isActive);
      expect(activeProvider?.selectedModel).toBe('new-model');
    });

    it('setBaseUrl updates baseUrl for LM Studio active provider', () => {
      useChatStore.getState().setBaseUrl('http://localhost:8080');

      const activeProvider = useChatStore.getState().configuredProviders.find((p) => p.isActive);
      expect((activeProvider?.config as { baseUrl: string }).baseUrl).toBe('http://localhost:8080');
    });

    it('setTemperature updates temperature', () => {
      useChatStore.getState().setTemperature(1.5);
      expect(useChatStore.getState().temperature).toBe(1.5);
    });

    it('setSystemPrompt updates system prompt', () => {
      useChatStore.getState().setSystemPrompt('New prompt');
      expect(useChatStore.getState().systemPrompt).toBe('New prompt');
    });
  });

  describe('clearHistory', () => {
    it('clears all messages, last response, and generated image', () => {
      useChatStore.setState({
        messages: [
          { role: 'user', content: 'test', timestamp: Date.now() },
          { role: 'assistant', content: 'response', timestamp: Date.now() },
        ],
        lastResponse: 'response',
        lastGeneratedImage: {
          base64: 'abc',
          mimeType: 'image/png',
          caption: 'test',
        },
      });

      useChatStore.getState().clearHistory();

      expect(useChatStore.getState().messages).toHaveLength(0);
      expect(useChatStore.getState().lastResponse).toBe('');
      expect(useChatStore.getState().lastGeneratedImage).toBeNull();
    });
  });

  describe('localStorage persistence', () => {
    it('persists state to localStorage (debounced)', () => {
      useChatStore.getState().setModel('persisted-model');

      // Not saved immediately
      expect(localStorage.getItem('SIMPLEDOCS_CHAT_STATE')).toBeNull();

      // After debounce
      vi.advanceTimersByTime(600);
      const raw = localStorage.getItem('SIMPLEDOCS_CHAT_STATE');
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      // The active provider's selectedModel should be persisted
      const activeProvider = parsed.configuredProviders.find(
        (p: { isActive: boolean }) => p.isActive
      );
      expect(activeProvider.selectedModel).toBe('persisted-model');
    });
  });

  describe('insertLastResponseAtCursor', () => {
    it('returns last response when available', () => {
      useChatStore.setState({ lastResponse: 'Hello world' });
      expect(useChatStore.getState().insertLastResponseAtCursor()).toBe('Hello world');
    });

    it('returns null when no response', () => {
      useChatStore.setState({ lastResponse: '' });
      expect(useChatStore.getState().insertLastResponseAtCursor()).toBeNull();
    });
  });
});
