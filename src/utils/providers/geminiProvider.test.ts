// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { geminiProvider } from './geminiProvider';
import type { ChatMessage } from '../../types/chat';

describe('geminiProvider', () => {
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
    it('queries the live models.list API and filters for generateContent', async () => {
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
            name: 'models/gemini-embedding-2',
            displayName: 'Gemini Embedding 2',
            supportedGenerationMethods: ['embedContent'],
          },
        ],
      };

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(liveResponse), { status: 200 })
      );

      const models = await geminiProvider.listModels({ apiKey: 'AIzaTest123' });

      // Should only include models supporting generateContent (not embedding)
      expect(models.length).toBe(2);
      expect(models[0].id).toBe('gemini-3.6-flash');
      expect(models[0].name).toBe('Gemini 3.6 Flash');
      expect(models[1].id).toBe('gemini-3.5-flash-lite');

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
      ).rejects.toThrow('Gemini API error');
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
});
