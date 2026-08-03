// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  healthcheck,
  listModels,
  loadModel,
  unloadModel,
  sendMessage,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TEMPERATURE,
} from './chatService';
import type { ChatMessage } from '../types/chat';

describe('chatService', () => {
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

      const result = await healthcheck();
      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        `${DEFAULT_BASE_URL}/v1/models`,
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('returns false when server responds with error', async () => {
      fetchMock.mockResolvedValueOnce(new Response('Not Found', { status: 404 }));

      const result = await healthcheck();
      expect(result).toBe(false);
    });

    it('returns false when fetch throws (server unreachable)', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      const result = await healthcheck();
      expect(result).toBe(false);
    });

    it('uses custom base URL when provided', async () => {
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }));

      await healthcheck('http://localhost:8080');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/v1/models',
        expect.any(Object)
      );
    });
  });

  describe('listModels', () => {
    it('returns array of ModelInfo from OpenAI-compatible API response', async () => {
      // OpenAI-compatible format: { object: 'list', data: [{ id, object, created, owned_by }] }
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

      const result = await listModels();
      expect(result).toHaveLength(2);
      // OpenAI endpoint doesn't expose load state, so state is 'unknown'
      expect(result[0]).toEqual({ id: 'model-1', name: 'model-1', state: 'unknown' });
      expect(result[1]).toEqual({ id: 'model-2', name: 'model-2', state: 'unknown' });
    });

    it('throws on non-OK response', async () => {
      fetchMock.mockResolvedValueOnce(new Response('Server Error', { status: 500 }));

      await expect(listModels()).rejects.toThrow('Failed to list models');
    });

    it('throws on invalid response format', async () => {
      const mockResponse = { object: 'list' }; // missing data array

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await expect(listModels()).rejects.toThrow('Invalid models response format');
    });

    it('calls the OpenAI-compatible /v1/models endpoint', async () => {
      const mockResponse = {
        data: [{ id: 'test-model', object: 'model' }],
        object: 'list',
      };

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await listModels();
      expect(fetchMock).toHaveBeenCalledWith(
        `${DEFAULT_BASE_URL}/v1/models`,
        expect.objectContaining({ method: 'GET' })
      );
    });
  });

  describe('loadModel', () => {
    it('sends POST request with modelId', async () => {
      fetchMock.mockResolvedValueOnce(new Response('OK', { status: 200 }));

      await loadModel('my-model');

      expect(fetchMock).toHaveBeenCalledWith(
        `${DEFAULT_BASE_URL}/api/v1/models/load`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelId: 'my-model' }),
        })
      );
    });

    it('throws on failure', async () => {
      fetchMock.mockResolvedValueOnce(new Response('Not Found', { status: 404 }));

      await expect(loadModel('unknown-model')).rejects.toThrow('Failed to load model');
    });
  });

  describe('unloadModel', () => {
    it('sends POST request with modelId', async () => {
      fetchMock.mockResolvedValueOnce(new Response('OK', { status: 200 }));

      await unloadModel('my-model');

      expect(fetchMock).toHaveBeenCalledWith(
        `${DEFAULT_BASE_URL}/api/v1/models/unload`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelId: 'my-model' }),
        })
      );
    });

    it('throws on failure', async () => {
      fetchMock.mockResolvedValueOnce(new Response('Error', { status: 500 }));

      await expect(unloadModel('my-model')).rejects.toThrow('Failed to unload model');
    });
  });

  describe('sendMessage', () => {
    const mockMessages: ChatMessage[] = [
      { role: 'user', content: 'Hello', timestamp: Date.now() },
    ];

    it('sends chat completion request and returns response text', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'test-model',
        choices: [
          {
            message: { role: 'assistant', content: 'Hi there!' },
            finish_reason: 'stop',
            index: 0,
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const result = await sendMessage(mockMessages, {
        baseUrl: 'http://localhost:1234',
        model: 'test-model',
        maxTokens: 4096,
        temperature: 0.5,
      });

      expect(result).toBe('Hi there!');

      // Verify request goes to OpenAI-compatible endpoint
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:1234/v1/chat/completions',
        expect.objectContaining({ method: 'POST' })
      );

      // Verify request body structure
      const callArgs = fetchMock.mock.calls[0];
      const options = callArgs[1] as RequestInit;
      const body = JSON.parse(options.body as string);
      expect(body.model).toBe('test-model');
      expect(body.max_tokens).toBe(4096);
      expect(body.temperature).toBe(0.5);
      expect(body.stream).toBe(false);
      expect(body.messages).toEqual([
        { role: 'user', content: 'Hello' },
      ]);
    });

    it('uses default config values when not provided', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: DEFAULT_MODEL,
        choices: [
          {
            message: { role: 'assistant', content: 'Response' },
            finish_reason: 'stop',
            index: 0,
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await sendMessage(mockMessages);

      const callArgs = fetchMock.mock.calls[0];
      const options = callArgs[1] as RequestInit;
      const body = JSON.parse(options.body as string);
      expect(body.model).toBe(DEFAULT_MODEL);
      expect(body.max_tokens).toBe(DEFAULT_MAX_TOKENS);
      expect(body.temperature).toBe(DEFAULT_TEMPERATURE);
    });

    it('throws on non-OK response', async () => {
      fetchMock.mockResolvedValueOnce(new Response('Bad Request', { status: 400 }));

      await expect(sendMessage(mockMessages)).rejects.toThrow('Chat request failed');
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

      await expect(sendMessage(mockMessages)).rejects.toThrow('No response choices');
    });
  });
});
