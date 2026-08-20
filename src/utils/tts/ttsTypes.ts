// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson

/**
 * TTS type definitions for the Text-to-Speech service.
 */

export interface TtsVoice {
  /** Internal voice URI (used by SpeechSynthesis) */
  voiceURI: string;
  /** Human-readable name (e.g., "English (US) — Alex") */
  name: string;
  /** Language code (e.g., "en-US") */
  lang: string;
  /** Whether this voice is from the local system */
  localService: boolean;
}

export type TtsPlaybackState = 'idle' | 'playing' | 'paused';

export interface TtsState {
  playbackState: TtsPlaybackState;
  currentVoiceURI: string;
  rate: number;
  volume: number;
  /** Progress as a fraction (0–1) of total text length */
  progress: number;
  /** Character offset into the text currently being spoken */
  currentCharIndex: number;
  /** Total length of text being spoken */
  totalChars: number;
}

export type TtsEventType = 'stateChange' | 'boundary' | 'end' | 'error';

export interface TtsEventMap {
  stateChange: TtsState;
  boundary: { charIndex: number; charLength: number; totalChars: number };
  end: void;
  error: SpeechSynthesisErrorEvent;
}
