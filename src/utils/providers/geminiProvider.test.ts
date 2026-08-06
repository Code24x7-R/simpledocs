// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { geminiProvider } from './geminiProvider';
import type { ChatMessage } from '../../types/chat';

describe('geminiProvider', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchMock: any;
  const originalSetTimeout = global.setTimeout;

  beforeEach(() => {
    fetchMock = vi.spyOn(global, 'fetch');
    // Make retry backoff delays instant (<=8s) while leaving the 120s
    // AbortSignal.timeout unaffected. This keeps retry tests fast.
    vi.spyOn(global, 'setTimeout').mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fn: TimerHandler, delay?: number, ...args: unknown[]): any => {
        if (typeof delay === 'number' && delay <= 8000) {
          if (fn instanceof Function) fn();
          return originalSetTimeout(() => {}, 0);
        }
        return originalSetTimeout(fn, delay, ...args);
      },
    );
  });

  afterEach(() => {
    fetchMock.mockRestore();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('healthcheck', () => {
    it('returns true when API responds OK', async () => {
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
        candidates: [{ content: { role: 'model', parts: [{ text: 'Hi' }] }, finishReason: 'STOP' }],
      }), { status: 200 }));

      const result = await geminiProvider.healthcheck({ apiKey: 'AIzaTest123' });
      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('probes gemini-3.6-flash (not preview)', async () => {
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
        candidates: [{ content: { role: 'model', parts: [{ text: 'Hi' }] }, finishReason: 'STOP' }],
      }), { status: 200 }));

      await geminiProvider.healthcheck({ apiKey: 'AIzaTest123' });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('gemini-3.6-flash:generateContent'),
        expect.any(Object)
      );
    });

    it('returns false when API responds with error', async () => {
      fetchMock.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));

      const result = await geminiProvider.healthcheck({ apiKey: 'AIzaInvalid' });
      expect(result).toBe(false);
    });

    it('returns false when fetch throws', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      const result = await geminiProvider.healthcheck({ apiKey: 'AIzaTest123' });
      expect(result).toBe(false);
    });

    it('returns false for invalid config', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await geminiProvider.healthcheck({} as any);
      expect(result).toBe(false);
    });
  });

  describe('listModels', () => {
    beforeEach(() => {
      // Clear models cache before each test
      localStorage.removeItem('SIMPLEDOCS_GEMINI_MODELS_CACHE');
    });

    it('queries the live models.list API and filters to flash family + nano banana', async () => {
      const liveResponse = {
        models: [
          {
            name: 'models/gemini-3.6-flash',
            displayName: 'Gemini 3.6 Flash',
            supportedGenerationMethods: ['generateContent', 'countTokens'],
          },
          {
            name: 'models/gemini-3.5-flash-lite',
            displayName: 'Gemini 3.5 Flash-Lite',
            supportedGenerationMethods: ['generateContent'],
          },
          {
            name: 'models/gemini-3.1-flash-lite-image',
            displayName: 'Gemini 3.1 Flash-Lite Image',
            supportedGenerationMethods: ['generateContent'],
          },
          {
            name: 'models/gemini-embedding-2',
            displayName: 'Gemini Embedding 2',
            supportedGenerationMethods: ['embedContent'],
          },
          {
            name: 'models/gemini-3-pro',
            displayName: 'Gemini 3 Pro',
            supportedGenerationMethods: ['generateContent'],
          },
          {
            name: 'models/imagen-4.0-generate-001',
            displayName: 'Imagen 4.0',
            supportedGenerationMethods: ['generateContent'],
          },
        ],
      };

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(liveResponse), { status: 200 })
      );

      const models = await geminiProvider.listModels({ apiKey: 'AIzaTest123' });

      // Should only include flash family + nano banana (not embedding, pro, imagen)
      expect(models.length).toBe(3);
      expect(models[0].id).toBe('gemini-3.6-flash');
      expect(models[0].name).toBe('Gemini 3.6 Flash');
      expect(models[1].id).toBe('gemini-3.5-flash-lite');
      expect(models[2].id).toBe('gemini-3.1-flash-lite-image');

      // Verify it called the models.list endpoint
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/models?key='),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('strips models/ prefix from resource names', async () => {
      const liveResponse = {
        models: [
          {
            name: 'models/gemini-3.5-flash',
            displayName: 'Gemini 3.5 Flash',
            supportedGenerationMethods: ['generateContent'],
          },
        ],
      };

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(liveResponse), { status: 200 })
      );

      const models = await geminiProvider.listModels({ apiKey: 'AIzaTest123' });
      expect(models[0].id).toBe('gemini-3.5-flash');
      expect(models[0].id).not.toContain('models/');
    });

    it('uses displayName as fallback name when missing', async () => {
      const liveResponse = {
        models: [
          {
            name: 'models/gemini-3.1-flash-lite',
            supportedGenerationMethods: ['generateContent'],
          },
        ],
      };

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(liveResponse), { status: 200 })
      );

      const models = await geminiProvider.listModels({ apiKey: 'AIzaTest123' });
      expect(models[0].id).toBe('gemini-3.1-flash-lite');
      expect(models[0].name).toBe('gemini-3.1-flash-lite');
    });

    it('falls back to hardcoded catalog when API is unreachable', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      const models = await geminiProvider.listModels({ apiKey: 'AIzaTest123' });
      expect(models.length).toBeGreaterThan(0);
      expect(models[0].id).toBe('gemini-3.6-flash');
    });

    it('falls back to hardcoded catalog when API returns non-OK', async () => {
      fetchMock.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));

      const models = await geminiProvider.listModels({ apiKey: 'AIzaTest123' });
      expect(models.length).toBeGreaterThan(0);
      expect(models[0].id).toBe('gemini-3.6-flash');
    });

    it('returns cached models on second call without hitting API again', async () => {
      const liveResponse = {
        models: [
          {
            name: 'models/gemini-3.6-flash',
            displayName: 'Gemini 3.6 Flash',
            supportedGenerationMethods: ['generateContent'],
          },
        ],
      };

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(liveResponse), { status: 200 })
      );

      // First call hits the API
      const models1 = await geminiProvider.listModels({ apiKey: 'AIzaTest123' });
      expect(models1.length).toBe(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Second call returns cached result — no additional fetch
      const models2 = await geminiProvider.listModels({ apiKey: 'AIzaTest123' });
      expect(models2.length).toBe(1);
      expect(models2[0].id).toBe('gemini-3.6-flash');
      expect(fetchMock).toHaveBeenCalledTimes(1); // still 1 — no new fetch
    });

    it('refetches after cache expires (24h)', async () => {
      const liveResponse = {
        models: [
          {
            name: 'models/gemini-3.6-flash',
            displayName: 'Gemini 3.6 Flash',
            supportedGenerationMethods: ['generateContent'],
          },
        ],
      };

      fetchMock.mockResolvedValue(
        new Response(JSON.stringify(liveResponse), { status: 200 })
      );

      // First call hits the API
      await geminiProvider.listModels({ apiKey: 'AIzaTest123' });
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Simulate 25 hours passing (cache TTL is 24h)
      vi.useFakeTimers();
      vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000);

      // Second call should refetch
      await geminiProvider.listModels({ apiKey: 'AIzaTest123' });
      expect(fetchMock).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('writes cache to localStorage after fetch', async () => {
      const liveResponse = {
        models: [
          {
            name: 'models/gemini-3.6-flash',
            displayName: 'Gemini 3.6 Flash',
            supportedGenerationMethods: ['generateContent'],
          },
        ],
      };

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(liveResponse), { status: 200 })
      );

      await geminiProvider.listModels({ apiKey: 'AIzaTest123' });

      const cached = JSON.parse(
        localStorage.getItem('SIMPLEDOCS_GEMINI_MODELS_CACHE') || '{}'
      );
      expect(cached.models).toHaveLength(1);
      expect(cached.models[0].id).toBe('gemini-3.6-flash');
      expect(typeof cached.timestamp).toBe('number');
    });

    it('marks gemini-3.6-flash as recommended in getAvailableModels', () => {
      const available = geminiProvider.getAvailableModels();
      const flash = available.find((m) => m.id === 'gemini-3.6-flash');
      expect(flash?.recommended).toBe(true);
    });
  });

  describe('sendMessage', () => {
    const mockMessages: ChatMessage[] = [
      { role: 'user', content: 'Hello', timestamp: Date.now() },
    ];

    it('sends request in Gemini format and returns response text', async () => {
      const mockResponse = {
        candidates: [{
          content: { role: 'model', parts: [{ text: 'Hello! How can I help?' }] },
          finishReason: 'STOP',
        }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
      };

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const result = await geminiProvider.sendMessage(
        mockMessages,
        { apiKey: 'AIzaTest123' },
        'gemini-3.6-flash',
        8192,
        0.7
      );

      expect(result).toBe('Hello! How can I help?');

      // Verify request goes to Gemini endpoint
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({ method: 'POST' })
      );

      // Verify request body structure
      const callArgs = fetchMock.mock.calls[0];
      const options = callArgs[1] as RequestInit;
      const body = JSON.parse(options.body as string);
      expect(body.contents).toHaveLength(1);
      expect(body.contents[0].role).toBe('user');
      expect(body.contents[0].parts[0].text).toBe('Hello');
    });

    it('does not send deprecated temperature parameter', async () => {
      const mockResponse = {
        candidates: [{
          content: { role: 'model', parts: [{ text: 'Hi' }] },
          finishReason: 'STOP',
        }],
      };

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await geminiProvider.sendMessage(
        mockMessages,
        { apiKey: 'AIzaTest123' },
        'gemini-3.6-flash',
        8192,
        0.7
      );

      const callArgs = fetchMock.mock.calls[0];
      const options = callArgs[1] as RequestInit;
      const body = JSON.parse(options.body as string);
      expect(body.generationConfig.temperature).toBeUndefined();
    });

    it('sends thinkingLevel nested inside thinkingConfig', async () => {
      const mockResponse = {
        candidates: [{
          content: { role: 'model', parts: [{ text: 'Hi' }] },
          finishReason: 'STOP',
        }],
      };

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await geminiProvider.sendMessage(
        mockMessages,
        { apiKey: 'AIzaTest123' },
        'gemini-3.6-flash',
        8192,
        0.7
      );

      const callArgs = fetchMock.mock.calls[0];
      const options = callArgs[1] as RequestInit;
      const body = JSON.parse(options.body as string);
      // thinkingLevel must be nested inside thinkingConfig, not directly in generationConfig
      expect(body.generationConfig.thinkingConfig).toBeDefined();
      expect(body.generationConfig.thinkingConfig.thinkingLevel).toBe('medium');
      expect(body.generationConfig.thinkingLevel).toBeUndefined();
    });

    it('uses minimal thinking level for lite models', async () => {
      const mockResponse = {
        candidates: [{
          content: { role: 'model', parts: [{ text: 'Hi' }] },
          finishReason: 'STOP',
        }],
      };

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await geminiProvider.sendMessage(
        mockMessages,
        { apiKey: 'AIzaTest123' },
        'gemini-3.5-flash-lite',
        8192,
        0.7
      );

      const callArgs = fetchMock.mock.calls[0];
      const options = callArgs[1] as RequestInit;
      const body = JSON.parse(options.body as string);
      expect(body.generationConfig.thinkingConfig.thinkingLevel).toBe('minimal');
    });

    it('uses maxTokens parameter for maxOutputTokens', async () => {
      const mockResponse = {
        candidates: [{
          content: { role: 'model', parts: [{ text: 'Hi' }] },
          finishReason: 'STOP',
        }],
      };

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await geminiProvider.sendMessage(
        mockMessages,
        { apiKey: 'AIzaTest123' },
        'gemini-3.6-flash',
        16384,
        0.7
      );

      const callArgs = fetchMock.mock.calls[0];
      const options = callArgs[1] as RequestInit;
      const body = JSON.parse(options.body as string);
      expect(body.generationConfig.maxOutputTokens).toBe(16384);
    });

    it('maps assistant role to model', async () => {
      const messagesWithAssistant: ChatMessage[] = [
        { role: 'user', content: 'Hello', timestamp: Date.now() },
        { role: 'assistant', content: 'Hi there!', timestamp: Date.now() },
        { role: 'user', content: 'How are you?', timestamp: Date.now() },
      ];

      const mockResponse = {
        candidates: [{
          content: { role: 'model', parts: [{ text: 'Doing well!' }] },
          finishReason: 'STOP',
        }],
      };

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await geminiProvider.sendMessage(
        messagesWithAssistant,
        { apiKey: 'AIzaTest123' },
        'gemini-3.6-flash',
        8192,
        0.7
      );

      const callArgs = fetchMock.mock.calls[0];
      const options = callArgs[1] as RequestInit;
      const body = JSON.parse(options.body as string);
      expect(body.contents[0].role).toBe('user');
      expect(body.contents[1].role).toBe('model');
      expect(body.contents[2].role).toBe('user');
    });

    it('converts system message to systemInstruction', async () => {
      const messagesWithSystem: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.', timestamp: Date.now() },
        { role: 'user', content: 'Hello', timestamp: Date.now() },
      ];

      const mockResponse = {
        candidates: [{
          content: { role: 'model', parts: [{ text: 'Hi!' }] },
          finishReason: 'STOP',
        }],
      };

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await geminiProvider.sendMessage(
        messagesWithSystem,
        { apiKey: 'AIzaTest123' },
        'gemini-3.6-flash',
        8192,
        0.7
      );

      const callArgs = fetchMock.mock.calls[0];
      const options = callArgs[1] as RequestInit;
      const body = JSON.parse(options.body as string);
      expect(body.systemInstruction).toBeDefined();
      expect(body.systemInstruction.parts[0].text).toBe('You are a helpful assistant.');
      // System message should not be in contents
      expect(body.contents).toHaveLength(1);
      expect(body.contents[0].role).toBe('user');
    });

    it('throws on non-OK response', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response('Bad Request', { status: 400 })
      );

      await expect(
        geminiProvider.sendMessage(
          mockMessages,
          { apiKey: 'AIzaTest123' },
          'gemini-3.6-flash',
          8192,
          0.7
        )
      ).rejects.toThrow('Bad request');
    });

    it('throws when no candidates returned', async () => {
      const mockResponse = { candidates: [] };

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await expect(
        geminiProvider.sendMessage(
          mockMessages,
          { apiKey: 'AIzaTest123' },
          'gemini-3.6-flash',
          8192,
          0.7
        )
      ).rejects.toThrow('No response candidates');
    });

    it('throws for invalid config', async () => {
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        geminiProvider.sendMessage(mockMessages, {} as any, 'gemini-3.6-flash', 8192, 0.7)
      ).rejects.toThrow('Invalid Gemini config');
    });
  });

  describe('validateConfig', () => {
    it('accepts valid API key', () => {
      const result = geminiProvider.validateConfig({ apiKey: 'AIzaSyAbc123def456' });
      expect(result.valid).toBe(true);
    });

    it('accepts any key with sufficient length (not just AIza prefix)', () => {
      const result = geminiProvider.validateConfig({ apiKey: 'AIzaSyAbc123def456ghijklmnopqrstuvwxyz' });
      expect(result.valid).toBe(true);
    });

    it('accepts AQ-prefixed keys', () => {
      const result = geminiProvider.validateConfig({ apiKey: 'AQ.Ab8RN6Ktestkey' });
      expect(result.valid).toBe(true);
    });

    it('rejects empty API key', () => {
      const result = geminiProvider.validateConfig({ apiKey: '' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('rejects key that is too short', () => {
      const result = geminiProvider.validateConfig({ apiKey: 'short' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too short');
    });

    it('rejects config without apiKey', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = geminiProvider.validateConfig({} as any);
      expect(result.valid).toBe(false);
    });
  });

  describe('defaults', () => {
    it('returns empty API key as default config', () => {
      const config = geminiProvider.getDefaultConfig();
      expect(config).toEqual({ apiKey: '' });
    });

    it('returns gemini-3.6-flash as default model', () => {
      expect(geminiProvider.getDefaultModel()).toBe('gemini-3.6-flash');
    });
  });

  describe('metadata', () => {
    it('has correct provider id', () => {
      expect(geminiProvider.id).toBe('gemini');
    });

    it('has display name', () => {
      expect(geminiProvider.name).toBe('Google Gemini');
    });

    it('marks free tier availability', () => {
      expect(geminiProvider.hasFreeTier).toBe(true);
    });
  });

  describe('generateImage', () => {
    it('sends request to gemini-2.5-flash-image endpoint', async () => {
      const mockBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({
          candidates: [{
            content: {
              role: 'model',
              parts: [
                { text: 'Here is your image.' },
                { inlineData: { mimeType: 'image/png', data: mockBase64 } },
              ],
            },
            finishReason: 'STOP',
          }],
        }), { status: 200 })
      );

      const result = await geminiProvider.generateImage!(
        'A cat sitting on a keyboard',
        { apiKey: 'AIzaTest123' }
      );

      // Verify it hits the image model endpoint
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('gemini-2.5-flash-image:generateContent'),
        expect.objectContaining({ method: 'POST' })
      );

      // Verify response is parsed correctly
      expect(result.base64).toBe(mockBase64);
      expect(result.mimeType).toBe('image/png');
      expect(result.caption).toBe('Here is your image.');
    });

    it('sends both TEXT and IMAGE responseModalities', async () => {
      const mockBase64 = 'abc123';
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({
          candidates: [{
            content: {
              role: 'model',
              parts: [
                { inlineData: { mimeType: 'image/png', data: mockBase64 } },
              ],
            },
            finishReason: 'STOP',
          }],
        }), { status: 200 })
      );

      await geminiProvider.generateImage!(
        'A sunset',
        { apiKey: 'AIzaTest123' }
      );

      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      // Must include BOTH TEXT and IMAGE (IMAGE alone returns empty)
      expect(body.generationConfig.responseModalities).toEqual(['TEXT', 'IMAGE']);
    });

    it('includes imageConfig when aspectRatio is provided', async () => {
      const mockBase64 = 'abc123';
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({
          candidates: [{
            content: {
              role: 'model',
              parts: [
                { inlineData: { mimeType: 'image/png', data: mockBase64 } },
              ],
            },
            finishReason: 'STOP',
          }],
        }), { status: 200 })
      );

      await geminiProvider.generateImage!(
        'A landscape',
        { apiKey: 'AIzaTest123' },
        { aspectRatio: '16:9', imageSize: '1K' }
      );

      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.generationConfig.imageConfig).toEqual({
        aspectRatio: '16:9',
        imageSize: '1K',
      });
    });

    it('omits imageConfig when no options provided', async () => {
      const mockBase64 = 'abc123';
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({
          candidates: [{
            content: {
              role: 'model',
              parts: [
                { inlineData: { mimeType: 'image/png', data: mockBase64 } },
              ],
            },
            finishReason: 'STOP',
          }],
        }), { status: 200 })
      );

      await geminiProvider.generateImage!(
        'A landscape',
        { apiKey: 'AIzaTest123' }
      );

      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.generationConfig.imageConfig).toBeUndefined();
    });

    it('throws for unsupported aspect ratio', async () => {
      await expect(
        geminiProvider.generateImage!(
          'A landscape',
          { apiKey: 'AIzaTest123' },
          { aspectRatio: '5:7' }
        )
      ).rejects.toThrow('Unsupported aspect ratio');
    });

    it('throws for invalid config', async () => {
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        geminiProvider.generateImage!('A cat', {} as any)
      ).rejects.toThrow('Invalid Gemini config');
    });

    it('throws on non-OK response', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response('Bad Request', { status: 400 })
      );

      await expect(
        geminiProvider.generateImage!('A cat', { apiKey: 'AIzaTest123' })
      ).rejects.toThrow('Bad request');
    });

    it('throws when no candidates returned', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ candidates: [] }), { status: 200 })
      );

      await expect(
        geminiProvider.generateImage!('A cat', { apiKey: 'AIzaTest123' })
      ).rejects.toThrow('No response candidates');
    });

    it('throws when response contains no image data', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({
          candidates: [{
            content: {
              role: 'model',
              parts: [{ text: 'I cannot generate that image.' }],
            },
            finishReason: 'SAFETY',
          }],
        }), { status: 200 })
      );

      await expect(
        geminiProvider.generateImage!('A cat', { apiKey: 'AIzaTest123' })
      ).rejects.toThrow('no image data');
    });

    it('concatenates multiple text parts into caption', async () => {
      const mockBase64 = 'abc123';
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({
          candidates: [{
            content: {
              role: 'model',
              parts: [
                { text: 'First line.' },
                { inlineData: { mimeType: 'image/png', data: mockBase64 } },
                { text: 'Second line.' },
              ],
            },
            finishReason: 'STOP',
          }],
        }), { status: 200 })
      );

      const result = await geminiProvider.generateImage!(
        'A cat',
        { apiKey: 'AIzaTest123' }
      );

      expect(result.caption).toBe('First line.\nSecond line.');
      expect(result.base64).toBe(mockBase64);
    });
  });

  describe('error handling', () => {
    const errorTestMessages: ChatMessage[] = [
      { role: 'user', content: 'Hello', timestamp: Date.now() },
    ];

    it('returns user-friendly message for 429 rate limit', async () => {
      const errorJson = JSON.stringify({
        error: { code: 429, message: 'Quota exceeded', status: 'RESOURCE_EXHAUSTED' },
      });
      // Retryable — all 4 attempts (initial + 3 retries) return 429
      fetchMock.mockImplementation(() => Promise.resolve(new Response(errorJson, { status: 429 })));

      await expect(
        geminiProvider.sendMessage(
          errorTestMessages,
          { apiKey: 'AIzaTest123' },
          'gemini-3.6-flash',
          8192,
          0.7
        )
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('returns user-friendly message for 401 unauthorized', async () => {
      const errorJson = JSON.stringify({
        error: { code: 401, message: 'API key not valid', status: 'UNAUTHENTICATED' },
      });
      fetchMock.mockResolvedValueOnce(new Response(errorJson, { status: 401 }));

      await expect(
        geminiProvider.sendMessage(
          errorTestMessages,
          { apiKey: 'AIzaTest123' },
          'gemini-3.6-flash',
          8192,
          0.7
        )
      ).rejects.toThrow('Authentication failed');
    });

    it('returns user-friendly message for 403 forbidden', async () => {
      const errorJson = JSON.stringify({
        error: { code: 403, message: 'Permission denied', status: 'PERMISSION_DENIED' },
      });
      fetchMock.mockResolvedValueOnce(new Response(errorJson, { status: 403 }));

      await expect(
        geminiProvider.sendMessage(
          errorTestMessages,
          { apiKey: 'AIzaTest123' },
          'gemini-3.6-flash',
          8192,
          0.7
        )
      ).rejects.toThrow('Access denied');
    });

    it('returns user-friendly message for 500 server error', async () => {
      const errorJson = JSON.stringify({
        error: { code: 500, message: 'Internal error', status: 'INTERNAL' },
      });
      // Retryable — all 4 attempts return 500
      fetchMock.mockImplementation(() => Promise.resolve(new Response(errorJson, { status: 500 })));

      await expect(
        geminiProvider.sendMessage(
          errorTestMessages,
          { apiKey: 'AIzaTest123' },
          'gemini-3.6-flash',
          8192,
          0.7
        )
      ).rejects.toThrow('server error');
    });

    it('handles non-JSON error responses gracefully', async () => {
      // Retryable — all 4 attempts return 503
      fetchMock.mockImplementation(() =>
        new Response('Something went wrong', { status: 503 })
      );

      await expect(
        geminiProvider.sendMessage(
          errorTestMessages,
          { apiKey: 'AIzaTest123' },
          'gemini-3.6-flash',
          8192,
          0.7
        )
      ).rejects.toThrow('temporarily unavailable');
    });

    it('truncates very long error messages', async () => {
      const longMessage = 'A'.repeat(300);
      const errorJson = JSON.stringify({
        error: { code: 400, message: longMessage, status: 'INVALID_ARGUMENT' },
      });
      fetchMock.mockResolvedValueOnce(new Response(errorJson, { status: 400 }));

      await expect(
        geminiProvider.sendMessage(
          errorTestMessages,
          { apiKey: 'AIzaTest123' },
          'gemini-3.6-flash',
          8192,
          0.7
        )
      ).rejects.toThrow(/\.\.\.$/);
    });

    it('returns user-friendly 429 message for image generation', async () => {
      const errorJson = JSON.stringify({
        error: { code: 429, message: 'Quota exceeded', status: 'RESOURCE_EXHAUSTED' },
      });
      // Retryable — all 4 attempts return 429
      fetchMock.mockImplementation(() => Promise.resolve(new Response(errorJson, { status: 429 })));

      await expect(
        geminiProvider.generateImage!('A cat', { apiKey: 'AIzaTest123' })
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('returns billing-required message for free_tier 429 errors', async () => {
      const errorJson = JSON.stringify({
        error: {
          code: 429,
          message: 'Quota exceeded for metric: generate_content_free_tier_requests, limit: 0, model: gemini-3.1-flash-lite-image',
          status: 'RESOURCE_EXHAUSTED',
        },
      });
      fetchMock.mockResolvedValueOnce(new Response(errorJson, { status: 429 }));

      await expect(
        geminiProvider.generateImage!('A cat', { apiKey: 'AIzaTest123' })
      ).rejects.toThrow('Image generation requires a paid tier');
    });

    it('does not retry free_tier 429 errors (quota is 0)', async () => {
      const errorJson = JSON.stringify({
        error: {
          code: 429,
          message: 'Quota exceeded for free_tier_requests, limit: 0',
          status: 'RESOURCE_EXHAUSTED',
        },
      });
      fetchMock.mockResolvedValueOnce(new Response(errorJson, { status: 429 }));

      await expect(
        geminiProvider.generateImage!('A cat', { apiKey: 'AIzaTest123' })
      ).rejects.toThrow('paid tier');

      // Should have only made 1 request (no retries for free_tier 429)
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry with exponential backoff', () => {
    const retryMessages: ChatMessage[] = [
      { role: 'user', content: 'Hello', timestamp: Date.now() },
    ];

    it('retries on 429 and succeeds on second attempt', async () => {
      const errorJson = JSON.stringify({
        error: { code: 429, message: 'Rate limited', status: 'RESOURCE_EXHAUSTED' },
      });
      const successResponse = {
        candidates: [{
          content: { role: 'model', parts: [{ text: 'Success after retry' }] },
          finishReason: 'STOP',
        }],
      };

      fetchMock
        .mockResolvedValueOnce(new Response(errorJson, { status: 429 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(successResponse), { status: 200 }));

      const result = await geminiProvider.sendMessage(
        retryMessages,
        { apiKey: 'AIzaTest123' },
        'gemini-3.6-flash',
        8192,
        0.7
      );

      expect(result).toBe('Success after retry');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('retries on 500 server error and succeeds', async () => {
      const errorJson = JSON.stringify({
        error: { code: 500, message: 'Internal error', status: 'INTERNAL' },
      });
      const successResponse = {
        candidates: [{
          content: { role: 'model', parts: [{ text: 'OK' }] },
          finishReason: 'STOP',
        }],
      };

      fetchMock
        .mockResolvedValueOnce(new Response(errorJson, { status: 500 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(successResponse), { status: 200 }));

      const result = await geminiProvider.sendMessage(
        retryMessages,
        { apiKey: 'AIzaTest123' },
        'gemini-3.6-flash',
        8192,
        0.7
      );

      expect(result).toBe('OK');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('does NOT retry on 401 (permanent error)', async () => {
      const errorJson = JSON.stringify({
        error: { code: 401, message: 'API key not valid', status: 'UNAUTHENTICATED' },
      });
      fetchMock.mockResolvedValueOnce(new Response(errorJson, { status: 401 }));

      await expect(
        geminiProvider.sendMessage(
          retryMessages,
          { apiKey: 'AIzaTest123' },
          'gemini-3.6-flash',
          8192,
          0.7
        )
      ).rejects.toThrow('Authentication failed');

      // Should have only made 1 attempt — no retry on 401
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does NOT retry on 400 (permanent error)', async () => {
      const errorJson = JSON.stringify({
        error: { code: 400, message: 'Invalid argument', status: 'INVALID_ARGUMENT' },
      });
      fetchMock.mockResolvedValueOnce(new Response(errorJson, { status: 400 }));

      await expect(
        geminiProvider.sendMessage(
          retryMessages,
          { apiKey: 'AIzaTest123' },
          'gemini-3.6-flash',
          8192,
          0.7
        )
      ).rejects.toThrow('Bad request');

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('throws after exhausting all retries on persistent 429', async () => {
      const errorJson = JSON.stringify({
        error: { code: 429, message: 'Rate limited', status: 'RESOURCE_EXHAUSTED' },
      });
      // All 4 attempts (initial + 3 retries) return 429
      fetchMock
        .mockResolvedValueOnce(new Response(errorJson, { status: 429 }))
        .mockResolvedValueOnce(new Response(errorJson, { status: 429 }))
        .mockResolvedValueOnce(new Response(errorJson, { status: 429 }))
        .mockResolvedValueOnce(new Response(errorJson, { status: 429 }));

      await expect(
        geminiProvider.sendMessage(
          retryMessages,
          { apiKey: 'AIzaTest123' },
          'gemini-3.6-flash',
          8192,
          0.7
        )
      ).rejects.toThrow('Rate limit exceeded');

      // Initial attempt + 3 retries = 4 total
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it('retries on 429 for image generation too', async () => {
      const errorJson = JSON.stringify({
        error: { code: 429, message: 'Rate limited', status: 'RESOURCE_EXHAUSTED' },
      });
      const successResponse = {
        candidates: [{
          content: {
            role: 'model',
            parts: [{ inlineData: { mimeType: 'image/png', data: 'abc123' } }],
          },
          finishReason: 'STOP',
        }],
      };

      fetchMock
        .mockResolvedValueOnce(new Response(errorJson, { status: 429 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(successResponse), { status: 200 }));

      const result = await geminiProvider.generateImage!('A cat', { apiKey: 'AIzaTest123' });

      expect(result.base64).toBe('abc123');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
