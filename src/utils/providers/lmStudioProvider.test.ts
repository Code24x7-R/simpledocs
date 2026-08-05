// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { lmStudioProvider } from './lmStudioProvider';
import type { ChatMessage } from '../../types/chat';

describe('lmStudioProvider', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
    vi.unstubAllGlobals();
  });

  describe('healthcheck', () => {
    it('returns true when server responds OK', async () => {
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }));

      const result = await lmStudioProvider.healthcheck({ baseUrl: 'http://localhost:1234' });
      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:1234/v1/models',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('returns false when server responds with error', async () => {
      fetchMock.mockResolvedValueOnce(new Response('Not Found', { status: 404 }));

      const result = await lmStudioProvider.healthcheck({ baseUrl: 'http://localhost:1234' });
      expect(result).toBe(false);
    });

    it('returns false when fetch throws', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      const result = await lmStudioProvider.healthcheck({ baseUrl: 'http://localhost:1234' });
      expect(result).toBe(false);
    });

    it('uses default base URL when config is invalid', async () => {
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await lmStudioProvider.healthcheck({} as any);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:1234/v1/models',
        expect.any(Object)
      );
    });
  });

  describe('listModels', () => {
    it('returns array of ModelInfo from OpenAI-compatible response', async () => {
      const mockResponse = {
        data: [
          { id: 'model-1', object: 'model', created: 1234567890, owned_by: 'organization' },
          { id: 'model-2', object: 'model', created: 1234567891, owned_by: 'user' },
        ],
        object: 'list',
      };

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const result = await lmStudioProvider.listModels({ baseUrl: 'http://localhost:1234' });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'model-1', name: 'model-1', state: 'unknown' });
      expect(result[1]).toEqual({ id: 'model-2', name: 'model-2', state: 'unknown' });
    });

    it('throws on non-OK response', async () => {
      fetchMock.mockResolvedValueOnce(new Response('Server Error', { status: 500 }));

      await expect(
        lmStudioProvider.listModels({ baseUrl: 'http://localhost:1234' })
      ).rejects.toThrow('Failed to list models');
    });

    it('throws on invalid response format', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ object: 'list' }), { status: 200 })
      );

      await expect(
        lmStudioProvider.listModels({ baseUrl: 'http://localhost:1234' })
      ).rejects.toThrow('Invalid models response format');
    });
  });

  describe('sendMessage', () => {
    const mockMessages: ChatMessage[] = [
      { role: 'user', content: 'Hello', timestamp: Date.now() },
    ];

    it('sends OpenAI-format request and returns response', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'test-model',
        choices: [{
          message: { role: 'assistant', content: 'Hi there!' },
          finish_reason: 'stop',
          index: 0,
        }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const result = await lmStudioProvider.sendMessage(
        mockMessages,
        { baseUrl: 'http://localhost:1234' },
        'test-model',
        4096,
        0.5
      );

      expect(result).toBe('Hi there!');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:1234/v1/chat/completions',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('throws on non-OK response', async () => {
      fetchMock.mockResolvedValueOnce(new Response('Bad Request', { status: 400 }));

      await expect(
        lmStudioProvider.sendMessage(
          mockMessages,
          { baseUrl: 'http://localhost:1234' },
          'test-model',
          4096,
          0.7
        )
      ).rejects.toThrow('Chat request failed');
    });

    it('throws when no choices returned', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'test-model',
        choices: [],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      };

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await expect(
        lmStudioProvider.sendMessage(
          mockMessages,
          { baseUrl: 'http://localhost:1234' },
          'test-model',
          4096,
          0.7
        )
      ).rejects.toThrow('No response choices');
    });
  });

  describe('validateConfig', () => {
    it('accepts valid URL', () => {
      const result = lmStudioProvider.validateConfig({ baseUrl: 'http://localhost:1234' });
      expect(result.valid).toBe(true);
    });

    it('rejects empty URL', () => {
      const result = lmStudioProvider.validateConfig({ baseUrl: '' });
      expect(result.valid).toBe(false);
    });

    it('rejects invalid URL format', () => {
      const result = lmStudioProvider.validateConfig({ baseUrl: 'not-a-url' });
      expect(result.valid).toBe(false);
    });

    it('rejects config without baseUrl', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = lmStudioProvider.validateConfig({} as any);
      expect(result.valid).toBe(false);
    });
  });

  describe('defaults', () => {
    it('returns default base URL', () => {
      expect(lmStudioProvider.getDefaultConfig()).toEqual({ baseUrl: 'http://localhost:1234' });
    });

    it('returns default model', () => {
      expect(lmStudioProvider.getDefaultModel()).toBe('google/gemma-4-e2b');
    });
  });

  describe('metadata', () => {
    it('has correct provider id', () => {
      expect(lmStudioProvider.id).toBe('lmstudio');
    });

    it('has display name', () => {
      expect(lmStudioProvider.name).toBe('LM Studio');
    });
  });
});
