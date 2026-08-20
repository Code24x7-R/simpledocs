// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson

/**
 * TtsPanel — floating control panel for Text-to-Speech.
 *
 * Docks to the bottom-center of the viewport (matching SearchReplaceModal style).
 * Provides:
 * - Play / Pause / Stop controls
 * - Voice selector dropdown
 * - Speed slider (0.5x – 2x)
 * - Volume slider (0% – 100%)
 * - Read All / Read Selection buttons
 * - Live progress/status
 */

import { useState, useEffect, useCallback } from 'react';
import { X, Play, Pause, Square, Volume2, VolumeX } from 'lucide-react';
import { TtsService } from '../../utils/tts/TtsService';
import type { TtsVoice, TtsPlaybackState } from '../../utils/tts/ttsTypes';
import type { Editor } from '@tiptap/react';

interface TtsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  editor: Editor | null;
}

export default function TtsPanel({ isOpen, onClose, editor }: TtsPanelProps) {
  const [voices, setVoices] = useState<TtsVoice[]>([]);
  const [playbackState, setPlaybackState] = useState<TtsPlaybackState>('idle');
  const [currentVoiceURI, setCurrentVoiceURI] = useState('');
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [status, setStatus] = useState('Ready');

  const tts = TtsService.getInstance();

  // Load voices on mount and subscribe to service events
  useEffect(() => {
    if (!isOpen) return;

    setVoices(tts.getVoices());
    setPlaybackState(tts.getState().playbackState);
    setCurrentVoiceURI(tts.getState().currentVoiceURI);
    setRate(tts.getState().rate);
    setVolume(tts.getState().volume);

    // Some browsers load voices asynchronously
    tts.onVoicesLoaded(() => {
      setVoices(tts.getVoices());
    });

    const unsubState = tts.on('stateChange', (state) => {
      setPlaybackState(state.playbackState);
      setRate(state.rate);
      setVolume(state.volume);

      if (state.playbackState === 'idle') {
        setStatus('Ready');
      } else if (state.playbackState === 'playing') {
        setStatus(`Reading... (${Math.round(state.progress * 100)}%)`);
      } else if (state.playbackState === 'paused') {
        setStatus(`Paused (${Math.round(state.progress * 100)}%)`);
      }
    });

    const unsubEnd = tts.on('end', () => {
      setStatus('Finished');
    });

    const unsubError = tts.on('error', (event) => {
      setStatus(`Error: ${event.error}`);
    });

    return () => {
      unsubState();
      unsubEnd();
      unsubError();
    };
  }, [isOpen, tts]);

  const handlePlayPause = useCallback(() => {
    if (playbackState === 'playing') {
      tts.pause();
    } else if (playbackState === 'paused') {
      tts.resume();
    }
  }, [playbackState, tts]);

  const handleStop = useCallback(() => {
    tts.stop();
    setStatus('Ready');
  }, [tts]);

  const handleVoiceChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const uri = e.target.value;
      setCurrentVoiceURI(uri);
      tts.setVoice(uri);
    },
    [tts]
  );

  const handleRateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newRate = parseFloat(e.target.value);
      setRate(newRate);
      tts.setRate(newRate);
    },
    [tts]
  );

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVol = parseFloat(e.target.value);
      setVolume(newVol);
      tts.setVolume(newVol);
    },
    [tts]
  );

  const handleReadAll = useCallback(() => {
    if (!editor) return;
    const text = editor.getText();
    if (!text || !text.trim()) {
      setStatus('No text to read');
      return;
    }
    tts.speak(text);
    setStatus('Reading...');
  }, [editor, tts]);

  const handleReadSelection = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) {
      setStatus('No text selected');
      return;
    }
    const text = editor.state.doc.textBetween(from, to, '\n');
    if (!text || !text.trim()) {
      setStatus('No text selected');
      return;
    }
    tts.speak(text);
    setStatus('Reading selection...');
  }, [editor, tts]);

  const handleClose = useCallback(() => {
    tts.stop();
    onClose();
  }, [tts, onClose]);

  if (!isOpen) return null;

  const isPlaying = playbackState === 'playing';
  const isPaused = playbackState === 'paused';

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[480px]">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Volume2 className="w-4 h-4" />
            Text-to-Speech
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-200 rounded"
            title="Close TTS panel"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-3 space-y-3">
          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            {/* Play / Pause */}
            <button
              onClick={handlePlayPause}
              disabled={playbackState === 'idle'}
              className={`p-2 rounded transition-colors ${
                playbackState === 'idle'
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            {/* Stop */}
            <button
              onClick={handleStop}
              disabled={playbackState === 'idle'}
              className={`p-2 rounded transition-colors ${
                playbackState === 'idle'
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Stop"
            >
              <Square className="w-4 h-4" />
            </button>

            {/* Mute indicator */}
            <button
              onClick={() => handleVolumeChange({ target: { value: volume > 0 ? '0' : '1' } } as React.ChangeEvent<HTMLInputElement>)}
              className="p-2 rounded hover:bg-gray-100 transition-colors"
              title={volume === 0 ? 'Unmute' : 'Mute'}
            >
              {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Read buttons */}
            <button
              onClick={handleReadSelection}
              disabled={!editor || editor.state.selection.empty}
              className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Read the selected text"
            >
              Selection
            </button>
            <button
              onClick={handleReadAll}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              title="Read the entire document"
            >
              Read All
            </button>
          </div>

          {/* Voice Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 w-12 shrink-0">Voice:</label>
            <select
              value={currentVoiceURI}
              onChange={handleVoiceChange}
              className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {voices.length === 0 && (
                <option value="">Default voice</option>
              )}
              {voices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name} ({voice.lang}){voice.localService ? '' : ' ☁'}
                </option>
              ))}
            </select>
          </div>

          {/* Speed Slider */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 w-12 shrink-0">Speed:</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={rate}
              onChange={handleRateChange}
              className="flex-1 h-1.5 accent-blue-600"
            />
            <span className="text-xs text-gray-600 w-10 text-right">{rate.toFixed(1)}x</span>
          </div>

          {/* Volume Slider */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 w-12 shrink-0">Vol:</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="flex-1 h-1.5 accent-blue-600"
            />
            <span className="text-xs text-gray-600 w-10 text-right">{Math.round(volume * 100)}%</span>
          </div>

          {/* Status */}
          <div className="text-xs text-gray-500 text-center py-1 bg-gray-50 rounded border border-gray-200">
            {status}
          </div>

          {/* Hint */}
          <div className="text-[10px] text-gray-400 text-center">
            Ctrl+Shift+T to toggle · Esc to close
          </div>
        </div>
      </div>
    </div>
  );
}
