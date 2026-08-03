// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useChatStore, estimateTokenCount } from './useChatStore';
import type { ChatMessage } from '../types/chat';

// Mock the chatService module
vi.mock('../utils/chatService', () => ({
  healthcheck: vi.fn(),
  listModels: vi.fn(),
  sendMessage: vi.fn(),
  loadModel: vi.fn(),
  unloadModel: vi.fn(),
  DEFAULT_BASE_URL: 'http://localhost:1234',
  DEFAULT_MODEL: 'google/gemma-4-e2b',
  DEFAULT_MAX_TOKENS: 65535,
  DEFAULT_TEMPERATURE: 0.7,
}));

import * as chatService from '../utils/chatService';

describe('useChatStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    useChatStore.setState({
      isConnected: false,
      isChecking: false,
      connectionError: null,
      models: [],
      selectedModel: 'google/gemma-4-e2b',
      baseUrl: 'http://localhost:1234',
      maxTokens: 65535,
      temperature: 0.7,
      systemPrompt: 'You are a helpful assistant.',
      messages: [],
      isLoading: false,
      lastResponse: '',
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
      vi.mocked(chatService.healthcheck).mockResolvedValueOnce(true);

      await useChatStore.getState().checkHealth();

      expect(useChatStore.getState().isConnected).toBe(true);
      expect(useChatStore.getState().isChecking).toBe(false);
      expect(useChatStore.getState().connectionError).toBeNull();
    });

    it('sets connection error on failed healthcheck', async () => {
      vi.mocked(chatService.healthcheck).mockResolvedValueOnce(false);

      await useChatStore.getState().checkHealth();

      expect(useChatStore.getState().isConnected).toBe(false);
      expect(useChatStore.getState().connectionError).toBe('Cannot reach LM Studio server');
    });

    it('handles exceptions gracefully', async () => {
      vi.mocked(chatService.healthcheck).mockRejectedValueOnce(new Error('Network error'));

      await useChatStore.getState().checkHealth();

      expect(useChatStore.getState().isConnected).toBe(false);
      expect(useChatStore.getState().connectionError).toBe('Network error');
    });
  });

  describe('refreshModels', () => {
    it('populates models list on success', async () => {
      const mockModels = [
        { id: 'model-1', name: 'model-1', state: 'loaded' as const },
        { id: 'model-2', name: 'model-2', state: 'unloaded' as const },
      ];
      vi.mocked(chatService.listModels).mockResolvedValueOnce(mockModels);

      await useChatStore.getState().refreshModels();

      expect(useChatStore.getState().models).toEqual(mockModels);
    });

    it('sets connection error on failure', async () => {
      vi.mocked(chatService.listModels).mockRejectedValueOnce(new Error('Failed'));

      await useChatStore.getState().refreshModels();

      expect(useChatStore.getState().connectionError).toBe('Failed');
    });
  });

  describe('sendMessage', () => {
    it('does nothing for empty messages', async () => {
      await useChatStore.getState().sendMessage('   ');
      expect(useChatStore.getState().messages).toHaveLength(0);
      expect(chatService.sendMessage).not.toHaveBeenCalled();
    });

    it('adds user message and gets assistant response', async () => {
      vi.mocked(chatService.sendMessage).mockResolvedValueOnce('AI response here');

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
      vi.mocked(chatService.sendMessage).mockReturnValueOnce(messagePromise);

      const sendPromise = useChatStore.getState().sendMessage('Test');

      // Should be loading
      expect(useChatStore.getState().isLoading).toBe(true);

      // Resolve the message
      resolveMessage!('Done');
      await sendPromise;

      expect(useChatStore.getState().isLoading).toBe(false);
    });

    it('handles API errors', async () => {
      vi.mocked(chatService.sendMessage).mockRejectedValueOnce(new Error('API down'));

      await useChatStore.getState().sendMessage('Hello');

      const state = useChatStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isConnected).toBe(false);
      expect(state.connectionError).toBe('API down');
    });

    it('includes system prompt in request', async () => {
      vi.mocked(chatService.sendMessage).mockResolvedValueOnce('OK');

      await useChatStore.getState().sendMessage('Hello');

      const callArgs = vi.mocked(chatService.sendMessage).mock.calls[0];
      const messages = callArgs[0] as ChatMessage[];
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toBe('You are a helpful assistant.');
    });
  });

  describe('setters', () => {
    it('setModel updates selected model', () => {
      useChatStore.getState().setModel('new-model');
      expect(useChatStore.getState().selectedModel).toBe('new-model');
    });

    it('setBaseUrl updates URL', () => {
      vi.mocked(chatService.healthcheck).mockResolvedValue(true);
      useChatStore.getState().setBaseUrl('http://localhost:8080');
      expect(useChatStore.getState().baseUrl).toBe('http://localhost:8080');
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
    it('clears all messages and last response', () => {
      useChatStore.setState({
        messages: [
          { role: 'user', content: 'test', timestamp: Date.now() },
          { role: 'assistant', content: 'response', timestamp: Date.now() },
        ],
        lastResponse: 'response',
      });

      useChatStore.getState().clearHistory();

      expect(useChatStore.getState().messages).toHaveLength(0);
      expect(useChatStore.getState().lastResponse).toBe('');
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
      expect(parsed.selectedModel).toBe('persisted-model');
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
