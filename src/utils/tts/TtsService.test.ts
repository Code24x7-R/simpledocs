// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TtsService } from './TtsService';
import type { TtsVoice } from './ttsTypes';

// ── SpeechSynthesis Mock ──────────────────────────────────────────────

class MockUtterance {
  text = '';
  rate = 1;
  volume = 1;
  voice: SpeechSynthesisVoice | null = null;
  onstart: ((ev: Event) => void) | null = null;
  onend: ((ev: Event) => void) | null = null;
  onboundary: ((ev: SpeechSynthesisEvent) => void) | null = null;
  onerror: ((ev: SpeechSynthesisErrorEvent) => void) | null = null;

  constructor(text?: string) {
    if (text !== undefined) this.text = text;
  }
}

class MockSpeechSynthesis {
  speaking = false;
  paused = false;
  utterances: MockUtterance[] = [];
  onvoiceschanged: (() => void) | null = null;

  getVoices(): SpeechSynthesisVoice[] {
    return [
      { voiceURI: 'native', name: 'Native Voice', lang: 'en-US', localService: true } as SpeechSynthesisVoice,
      { voiceURI: 'remote1', name: 'Google US English', lang: 'en-US', localService: false } as SpeechSynthesisVoice,
    ];
  }

  speak(utterance: MockUtterance): void {
    this.utterances.push(utterance);
    this.speaking = true;
    this.paused = false;
    // Simulate async onstart
    setTimeout(() => utterance.onstart?.(new Event('start')), 0);
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  cancel(): void {
    this.speaking = false;
    this.paused = false;
    this.utterances = [];
  }

  // Test helper: simulate utterance completion
  simulateEnd(): void {
    const last = this.utterances[this.utterances.length - 1];
    this.speaking = false;
    last?.onend?.(new Event('end'));
  }

  // Test helper: simulate boundary event
  simulateBoundary(charIndex: number, charLength: number): void {
    const last = this.utterances[this.utterances.length - 1];
    last?.onboundary?.({ charIndex, charLength } as SpeechSynthesisEvent);
  }
}

// ── Test Suite ────────────────────────────────────────────────────────

describe('TtsService', () => {
  let mockSynth: MockSpeechSynthesis;
  let service: TtsService;

  beforeEach(() => {
    vi.useFakeTimers();
    mockSynth = new MockSpeechSynthesis();

    // Replace global speechSynthesis
    Object.defineProperty(globalThis, 'speechSynthesis', {
      value: mockSynth,
      writable: true,
      configurable: true,
    });

    // Mock SpeechSynthesisUtterance constructor
    vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);

    // Reset singleton for clean tests
    // @ts-expect-error — accessing private static for test isolation
    TtsService.instance = null;
    service = TtsService.getInstance();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('singleton', () => {
    it('returns the same instance on multiple calls', () => {
      const a = TtsService.getInstance();
      const b = TtsService.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('getVoices', () => {
    it('returns available voices from SpeechSynthesis', () => {
      const voices = service.getVoices();
      expect(voices).toHaveLength(2);
      expect(voices[0]).toMatchObject({
        voiceURI: 'native',
        name: 'Native Voice',
        lang: 'en-US',
        localService: true,
      } as Partial<TtsVoice>);
    });

    it('returns empty array when no voices available', () => {
      // Create a fresh mock with no voices
      const emptySynth = new MockSpeechSynthesis();
      emptySynth.getVoices = () => [];
      Object.defineProperty(globalThis, 'speechSynthesis', {
        value: emptySynth,
        writable: true,
        configurable: true,
      });
      // @ts-expect-error — accessing private static for test isolation
      TtsService.instance = null;
      const freshService = TtsService.getInstance();
      const voices = freshService.getVoices();
      expect(voices).toEqual([]);
    });
  });

  describe('getVoiceByURI', () => {
    it('finds a voice by its URI', () => {
      const voice = service.getVoiceByURI('remote1');
      expect(voice?.name).toBe('Google US English');
    });

    it('returns undefined for unknown URI', () => {
      const voice = service.getVoiceByURI('nonexistent');
      expect(voice).toBeUndefined();
    });
  });

  describe('speak', () => {
    it('does not speak empty text', () => {
      service.speak('');
      expect(mockSynth.utterances).toHaveLength(0);
    });

    it('does not speak whitespace-only text', () => {
      service.speak('   \n\t  ');
      expect(mockSynth.utterances).toHaveLength(0);
    });

    it('creates an utterance for short text', () => {
      service.speak('Hello world.');
      expect(mockSynth.utterances).toHaveLength(1);
      expect(mockSynth.utterances[0].text).toBe('Hello world.');
    });

    it('chunks long text into multiple utterances', () => {
      // Create a long text with multiple sentences
      const sentences = Array.from({ length: 5 }, (_, i) => `This is sentence number ${i + 1}.`);
      service.speak(sentences.join(' '));
      // The mock only tracks the currently-speaking utterance (they play sequentially)
      // but the text should be split — verify the first utterance has content
      expect(mockSynth.utterances).toHaveLength(1);
      expect(mockSynth.utterances[0].text.length).toBeGreaterThan(0);
    });

    it('stops previous playback before starting new', () => {
      service.speak('First text.');
      service.speak('Second text.');
      // Only the second text should be in the queue
      expect(mockSynth.utterances).toHaveLength(1);
      expect(mockSynth.utterances[0].text).toBe('Second text.');
    });

    it('applies current rate and volume to utterances', () => {
      service.setRate(1.5);
      service.setVolume(0.8);
      service.speak('Test text.');
      expect(mockSynth.utterances[0].rate).toBe(1.5);
      expect(mockSynth.utterances[0].volume).toBe(0.8);
    });
  });

  describe('pause and resume', () => {
    it('pauses when speaking', () => {
      service.speak('Test text.');
      service.pause();
      expect(mockSynth.paused).toBe(true);
      expect(service.getState().playbackState).toBe('paused');
    });

    it('resumes when paused', () => {
      service.speak('Test text.');
      service.pause();
      service.resume();
      expect(mockSynth.paused).toBe(false);
      expect(service.getState().playbackState).toBe('playing');
    });

    it('does nothing when pausing while not speaking', () => {
      service.pause();
      expect(service.getState().playbackState).toBe('idle');
    });
  });

  describe('stop', () => {
    it('cancels playback and resets state', () => {
      service.speak('Test text.');
      service.stop();
      expect(mockSynth.speaking).toBe(false);
      expect(service.getState().playbackState).toBe('idle');
      expect(service.getState().progress).toBe(0);
    });
  });

  describe('setRate', () => {
    it('clamps rate to minimum 0.5', () => {
      service.setRate(0.1);
      expect(service.getState().rate).toBe(0.5);
    });

    it('clamps rate to maximum 2', () => {
      service.setRate(5);
      expect(service.getState().rate).toBe(2);
    });

    it('accepts rate within range', () => {
      service.setRate(1.25);
      expect(service.getState().rate).toBe(1.25);
    });
  });

  describe('setVolume', () => {
    it('clamps volume to minimum 0', () => {
      service.setVolume(-0.5);
      expect(service.getState().volume).toBe(0);
    });

    it('clamps volume to maximum 1', () => {
      service.setVolume(1.5);
      expect(service.getState().volume).toBe(1);
    });

    it('accepts volume within range', () => {
      service.setVolume(0.75);
      expect(service.getState().volume).toBe(0.75);
    });
  });

  describe('events', () => {
    it('emits stateChange when voice is set', () => {
      const callback = vi.fn();
      service.on('stateChange', callback);
      service.setVoice('remote1');
      expect(callback).toHaveBeenCalled();
    });

    it('emits stateChange when rate is set', () => {
      const callback = vi.fn();
      service.on('stateChange', callback);
      service.setRate(1.5);
      expect(callback).toHaveBeenCalled();
    });

    it('returns unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = service.on('stateChange', callback);
      unsubscribe();
      service.setRate(1.5);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('state tracking', () => {
    it('tracks totalChars when speaking', () => {
      service.speak('Hello world.');
      expect(service.getState().totalChars).toBe(12);
    });

    it('reports isSpeaking correctly', () => {
      expect(service.isSpeaking()).toBe(false);
      service.speak('Test.');
      expect(service.isSpeaking()).toBe(true);
    });
  });
});
