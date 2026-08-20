// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson

/**
 * TtsService — singleton wrapper around the Web Speech API (SpeechSynthesis).
 *
 * Design:
 * - Singleton: only one speech synthesis instance should exist app-wide
 * - Event-driven: emits stateChange/boundary/end/error events for UI binding
 * - Sentence chunking: long text is split into sentences for natural pauses
 *   and accurate progress tracking
 * - Queue-based: manages an internal queue of utterances, advancing on 'end'
 */

import type { TtsVoice, TtsState, TtsEventType, TtsEventMap } from './ttsTypes';

type EventCallback<T extends TtsEventType> = (data: TtsEventMap[T]) => void;

/** Maximum characters per utterance — SpeechSynthesis has limits */
const MAX_UTTERANCE_LENGTH = 200;

/** Default voice URI (empty = browser default) */
const DEFAULT_VOICE_URI = '';

const DEFAULT_STATE: TtsState = {
  playbackState: 'idle',
  currentVoiceURI: DEFAULT_VOICE_URI,
  rate: 1,
  volume: 1,
  progress: 0,
  currentCharIndex: 0,
  totalChars: 0,
};

export class TtsService {
  private static instance: TtsService | null = null;

  private synth: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private state: TtsState = { ...DEFAULT_STATE };
  private utteranceQueue: SpeechSynthesisUtterance[] = [];
  private currentUtteranceIndex = 0;
  private textOffsets: number[] = []; // char offset for each utterance in original text

  private listeners: { [K in TtsEventType]: Set<EventCallback<K>> } = {
    stateChange: new Set(),
    boundary: new Set(),
    end: new Set(),
    error: new Set(),
  };

  private voicesLoaded = false;
  private onVoicesChanged: (() => void) | null = null;

  private constructor() {
    this.synth = window.speechSynthesis;
    this.loadVoices();

    // Voices may load asynchronously in some browsers
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
  }

  static getInstance(): TtsService {
    if (!TtsService.instance) {
      TtsService.instance = new TtsService();
    }
    return TtsService.instance;
  }

  // ── Voice Management ──────────────────────────────────────────────

  private loadVoices(): void {
    this.voices = this.synth.getVoices();
    this.voicesLoaded = this.voices.length > 0;
    if (this.voicesLoaded) {
      this.onVoicesChanged?.();
    }
  }

  getVoices(): TtsVoice[] {
    if (!this.voicesLoaded) {
      this.loadVoices();
    }
    return this.voices.map((v) => ({
      voiceURI: v.voiceURI,
      name: v.name,
      lang: v.lang,
      localService: v.localService,
    }));
  }

  getVoiceByURI(uri: string): TtsVoice | undefined {
    return this.getVoices().find((v) => v.voiceURI === uri);
  }

  setVoice(voiceURI: string): void {
    this.state.currentVoiceURI = voiceURI;
    this.emit('stateChange', this.state);
  }

  onVoicesLoaded(callback: () => void): void {
    this.onVoicesChanged = callback;
    if (this.voicesLoaded) {
      callback();
    }
  }

  // ── Playback Controls ─────────────────────────────────────────────

  /**
   * Speak the given text. Stops any current playback first.
   */
  speak(text: string): void {
    if (!text || !text.trim()) return;

    this.stop();

    // Build utterance queue from text
    const sentences = this.chunkText(text);
    this.textOffsets = [];
    this.utteranceQueue = [];

    let offset = 0;
    for (const sentence of sentences) {
      const utterance = this.createUtterance(sentence);
      this.utteranceQueue.push(utterance);
      this.textOffsets.push(offset);
      offset += sentence.length;
    }

    this.state.totalChars = text.length;
    this.state.currentCharIndex = 0;
    this.state.progress = 0;
    this.currentUtteranceIndex = 0;

    this.playCurrentUtterance();
  }

  pause(): void {
    if (this.synth.speaking && !this.synth.paused) {
      this.synth.pause();
      this.state.playbackState = 'paused';
      this.emit('stateChange', this.state);
    }
  }

  resume(): void {
    if (this.synth.paused) {
      this.synth.resume();
      this.state.playbackState = 'playing';
      this.emit('stateChange', this.state);
    }
  }

  stop(): void {
    this.synth.cancel();
    this.utteranceQueue = [];
    this.currentUtteranceIndex = 0;
    this.textOffsets = [];
    this.state.playbackState = 'idle';
    this.state.progress = 0;
    this.state.currentCharIndex = 0;
    this.state.totalChars = 0;
    this.emit('stateChange', this.state);
  }

  // ── Properties ────────────────────────────────────────────────────

  setRate(rate: number): void {
    this.state.rate = Math.max(0.5, Math.min(2, rate));
    this.emit('stateChange', this.state);
  }

  setVolume(volume: number): void {
    this.state.volume = Math.max(0, Math.min(1, volume));
    this.emit('stateChange', this.state);
  }

  getState(): TtsState {
    return { ...this.state };
  }

  isSpeaking(): boolean {
    return this.synth.speaking;
  }

  isPaused(): boolean {
    return this.synth.paused;
  }

  // ── Event System ──────────────────────────────────────────────────

  on<T extends TtsEventType>(event: T, callback: EventCallback<T>): () => void {
    this.listeners[event].add(callback as EventCallback<TtsEventType>);
    return () => {
      this.listeners[event].delete(callback as EventCallback<TtsEventType>);
    };
  }

  private emit<T extends TtsEventType>(event: T, data: TtsEventMap[T]): void {
    for (const callback of this.listeners[event]) {
      (callback as EventCallback<T>)(data);
    }
  }

  // ── Internal ──────────────────────────────────────────────────────

  /**
   * Split text into sentence-level chunks for natural pauses.
   * Falls back to length-based splitting if no sentence boundaries found.
   */
  private chunkText(text: string): string[] {
    const result: string[] = [];

    // Split on sentence boundaries (. ! ? followed by space or end)
    const sentenceRegex = /[^.!?]+[.!?]+[\s]*/g;
    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = sentenceRegex.exec(text)) !== null) {
      result.push(match[0]);
      lastIndex = sentenceRegex.lastIndex;
    }

    // Capture trailing text without sentence-ending punctuation
    if (lastIndex < text.length) {
      const trailing = text.slice(lastIndex).trim();
      if (trailing) result.push(trailing);
    }

    // If no sentences found (no punctuation), fall back to length-based chunks
    if (result.length === 0 && text.trim()) {
      return this.splitByLength(text.trim(), MAX_UTTERANCE_LENGTH);
    }

    // Merge very small chunks and split very long ones
    return this.normalizeChunks(result);
  }

  private splitByLength(text: string, maxLen: number): string[] {
    const chunks: string[] = [];
    let pos = 0;
    while (pos < text.length) {
      let end = Math.min(pos + maxLen, text.length);
      // Try to break at a word boundary
      if (end < text.length) {
        const spaceIdx = text.lastIndexOf(' ', end);
        if (spaceIdx > pos) {
          end = spaceIdx + 1;
        }
      }
      chunks.push(text.slice(pos, end));
      pos = end;
    }
    return chunks;
  }

  private normalizeChunks(chunks: string[]): string[] {
    const result: string[] = [];
    let buffer = '';

    for (const chunk of chunks) {
      if (buffer.length + chunk.length > MAX_UTTERANCE_LENGTH && buffer) {
        result.push(buffer);
        buffer = chunk;
      } else {
        buffer += chunk;
      }
    }
    if (buffer) result.push(buffer);

    // Final pass: split any remaining oversized chunks
    const final: string[] = [];
    for (const chunk of result) {
      if (chunk.length > MAX_UTTERANCE_LENGTH) {
        final.push(...this.splitByLength(chunk, MAX_UTTERANCE_LENGTH));
      } else {
        final.push(chunk);
      }
    }
    return final;
  }

  private createUtterance(text: string): SpeechSynthesisUtterance {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.state.rate;
    utterance.volume = this.state.volume;

    // Set voice if specified
    if (this.state.currentVoiceURI) {
      const voice = this.voices.find((v) => v.voiceURI === this.state.currentVoiceURI);
      if (voice) utterance.voice = voice;
    }

    utterance.onstart = () => {
      this.state.playbackState = 'playing';
      this.emit('stateChange', this.state);
    };

    utterance.onend = () => {
      // Check if there are more utterances in the queue
      this.currentUtteranceIndex++;
      if (this.currentUtteranceIndex < this.utteranceQueue.length) {
        this.playCurrentUtterance();
      } else {
        // All utterances complete
        this.state.playbackState = 'idle';
        this.state.progress = 1;
        this.state.currentCharIndex = this.state.totalChars;
        this.utteranceQueue = [];
        this.currentUtteranceIndex = 0;
        this.emit('stateChange', this.state);
        this.emit('end', undefined);
      }
    };

    utterance.onboundary = (event) => {
      const queueOffset = this.textOffsets[this.currentUtteranceIndex] ?? 0;
      const charIndex = queueOffset + (event.charIndex ?? 0);
      const charLength = event.charLength ?? 0;

      this.state.currentCharIndex = charIndex;
      this.state.progress = this.state.totalChars > 0 ? charIndex / this.state.totalChars : 0;

      this.emit('boundary', { charIndex, charLength, totalChars: this.state.totalChars });
      // Also emit state change for progress updates
      this.emit('stateChange', this.state);
    };

    utterance.onerror = (event) => {
      // Don't treat user-initiated cancellation as an error
      if (event.error === 'canceled' || event.error === 'interrupted') return;

      this.state.playbackState = 'idle';
      this.emit('stateChange', this.state);
      this.emit('error', event);
    };

    return utterance;
  }

  private playCurrentUtterance(): void {
    if (this.currentUtteranceIndex >= this.utteranceQueue.length) return;
    const utterance = this.utteranceQueue[this.currentUtteranceIndex];

    // Re-apply current rate/volume in case they changed
    utterance.rate = this.state.rate;
    utterance.volume = this.state.volume;

    this.synth.speak(utterance);
  }
}
