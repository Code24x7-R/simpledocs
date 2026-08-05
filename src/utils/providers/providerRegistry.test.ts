// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect } from 'vitest';
import { getProvider, getAllProviders } from './providerRegistry';

describe('providerRegistry', () => {
  describe('getProvider', () => {
    it('returns LM Studio provider by id', () => {
      const provider = getProvider('lmstudio');
      expect(provider).toBeDefined();
      expect(provider?.id).toBe('lmstudio');
      expect(provider?.name).toBe('LM Studio');
    });

    it('returns Gemini provider by id', () => {
      const provider = getProvider('gemini');
      expect(provider).toBeDefined();
      expect(provider?.id).toBe('gemini');
      expect(provider?.name).toBe('Google Gemini');
    });

    it('returns undefined for unknown provider id', () => {
      const provider = getProvider('unknown');
      expect(provider).toBeUndefined();
    });
  });

  describe('getAllProviders', () => {
    it('returns all registered providers', () => {
      const providers = getAllProviders();
      expect(providers.length).toBeGreaterThanOrEqual(2);
      const ids = providers.map((p) => p.id);
      expect(ids).toContain('lmstudio');
      expect(ids).toContain('gemini');
    });

    it('returns providers with required interface methods', () => {
      const providers = getAllProviders();
      for (const provider of providers) {
        expect(provider).toHaveProperty('healthcheck');
        expect(provider).toHaveProperty('listModels');
        expect(provider).toHaveProperty('sendMessage');
        expect(provider).toHaveProperty('getDefaultConfig');
        expect(provider).toHaveProperty('getDefaultModel');
        expect(provider).toHaveProperty('validateConfig');
        expect(provider).toHaveProperty('getAvailableModels');
        expect(typeof provider.healthcheck).toBe('function');
        expect(typeof provider.listModels).toBe('function');
        expect(typeof provider.sendMessage).toBe('function');
      }
    });
  });
});
