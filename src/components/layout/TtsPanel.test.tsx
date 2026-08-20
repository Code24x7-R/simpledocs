// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { type Editor } from '@tiptap/core';
import TtsPanel from './TtsPanel';

// ── Hoisted mocks (must be defined before vi.mock factory) ─────────────

const {
  mockGetVoices,
  mockGetState,
  mockSpeak,
  mockPause,
  mockResume,
  mockStop,
  mockSetVoice,
  mockSetRate,
  mockSetVolume,
  mockOnVoicesLoaded,
  mockOn,
  capturedCallbacks,
} = vi.hoisted(() => {
  const capturedCallbacks: { [key: string]: Array<(data?: unknown) => void> } = {};
  return {
    mockGetVoices: vi.fn(),
    mockGetState: vi.fn(),
    mockSpeak: vi.fn(),
    mockPause: vi.fn(),
    mockResume: vi.fn(),
    mockStop: vi.fn(),
    mockSetVoice: vi.fn(),
    mockSetRate: vi.fn(),
    mockSetVolume: vi.fn(),
    mockOnVoicesLoaded: vi.fn(),
    mockOn: vi.fn().mockImplementation((event: string, cb: (data?: unknown) => void) => {
      if (!capturedCallbacks[event]) capturedCallbacks[event] = [];
      capturedCallbacks[event].push(cb);
      return () => {};
    }),
    capturedCallbacks,
  };
});

// ── TtsService Mock ────────────────────────────────────────────────────

vi.mock('../../utils/tts/TtsService', () => {
  const mockService = {
    getInstance: () => mockService,
    getVoices: mockGetVoices,
    getState: mockGetState,
    speak: mockSpeak,
    pause: mockPause,
    resume: mockResume,
    stop: mockStop,
    setVoice: mockSetVoice,
    setRate: mockSetRate,
    setVolume: mockSetVolume,
    onVoicesLoaded: mockOnVoicesLoaded,
    on: mockOn,
    isSpeaking: vi.fn().mockReturnValue(false),
    isPaused: vi.fn().mockReturnValue(false),
  };
  return { TtsService: mockService };
});

// ── Editor Mocks ───────────────────────────────────────────────────────

const createMockEditor = (text: string, hasSelection: boolean) => ({
  getText: vi.fn().mockReturnValue(text),
  state: {
    selection: { from: 0, to: hasSelection ? 10 : 0, empty: !hasSelection },
    doc: { textBetween: vi.fn().mockReturnValue(hasSelection ? 'selected text' : '') },
  },
}) as unknown as Editor;

const mockEditor = createMockEditor('Hello world. This is a test document.', false);
const mockEditorWithSelection = createMockEditor('Full document text.', true);
const mockEmptyEditor = createMockEditor('', false);

// ── Default mock return values ─────────────────────────────────────────

mockGetVoices.mockReturnValue([
  { voiceURI: 'v1', name: 'Alex', lang: 'en-US', localService: true },
  { voiceURI: 'v2', name: 'Samantha', lang: 'en-US', localService: true },
]);

mockGetState.mockReturnValue({
  playbackState: 'idle',
  currentVoiceURI: '',
  rate: 1,
  volume: 1,
  progress: 0,
  currentCharIndex: 0,
  totalChars: 0,
});

mockOn.mockReturnValue(vi.fn()); // unsubscribe function

// ── Tests ──────────────────────────────────────────────────────────────

describe('TtsPanel', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear captured callbacks from previous tests
    for (const key of Object.keys(capturedCallbacks)) {
      delete capturedCallbacks[key];
    }
    // Reset to defaults after clearAllMocks
    mockGetVoices.mockReturnValue([
      { voiceURI: 'v1', name: 'Alex', lang: 'en-US', localService: true },
      { voiceURI: 'v2', name: 'Samantha', lang: 'en-US', localService: true },
    ]);
    mockGetState.mockReturnValue({
      playbackState: 'idle',
      currentVoiceURI: '',
      rate: 1,
      volume: 1,
      progress: 0,
      currentCharIndex: 0,
      totalChars: 0,
    });
    // Re-apply the implementation that captures callbacks
    mockOn.mockImplementation((event: string, cb: (data?: unknown) => void) => {
      if (!capturedCallbacks[event]) capturedCallbacks[event] = [];
      capturedCallbacks[event].push(cb);
      return () => {};
    });
  });

  it('does not render when isOpen is false', () => {
    render(<TtsPanel isOpen={false} onClose={mockOnClose} editor={mockEditor} />);
    expect(screen.queryByText('Text-to-Speech')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    render(<TtsPanel isOpen={true} onClose={mockOnClose} editor={mockEditor} />);
    expect(screen.getByText('Text-to-Speech')).toBeInTheDocument();
  });

  it('displays voice options from the service', () => {
    render(<TtsPanel isOpen={true} onClose={mockOnClose} editor={mockEditor} />);
    expect(screen.getByText('Alex (en-US)')).toBeInTheDocument();
    expect(screen.getByText('Samantha (en-US)')).toBeInTheDocument();
  });

  it('calls onClose and stop when close button is clicked', () => {
    render(<TtsPanel isOpen={true} onClose={mockOnClose} editor={mockEditor} />);
    fireEvent.click(screen.getByTitle('Close TTS panel'));
    expect(mockStop).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls tts.speak with full text when Read All is clicked', () => {
    render(<TtsPanel isOpen={true} onClose={mockOnClose} editor={mockEditor} />);
    fireEvent.click(screen.getByText('Read All'));
    expect(mockSpeak).toHaveBeenCalledWith('Hello world. This is a test document.');
  });

  it('shows status when no text available and Read All clicked', () => {
    render(<TtsPanel isOpen={true} onClose={mockOnClose} editor={mockEmptyEditor} />);
    fireEvent.click(screen.getByText('Read All'));
    expect(screen.getByText('No text to read')).toBeInTheDocument();
  });

  it('calls tts.speak with selected text when Selection is clicked', () => {
    render(<TtsPanel isOpen={true} onClose={mockOnClose} editor={mockEditorWithSelection} />);
    fireEvent.click(screen.getByText('Selection'));
    expect(mockSpeak).toHaveBeenCalledWith('selected text');
  });

  it('disables Selection button when no text is selected', () => {
    render(<TtsPanel isOpen={true} onClose={mockOnClose} editor={mockEditor} />);
    const selBtn = screen.getByText('Selection');
    expect(selBtn).toBeDisabled();
  });

  it('calls tts.pause when Pause button clicked while playing', () => {
    mockGetState.mockReturnValue({
      playbackState: 'playing',
      currentVoiceURI: '',
      rate: 1,
      volume: 1,
      progress: 0.5,
      currentCharIndex: 10,
      totalChars: 20,
    });
    render(<TtsPanel isOpen={true} onClose={mockOnClose} editor={mockEditor} />);
    fireEvent.click(screen.getByTitle('Pause'));
    expect(mockPause).toHaveBeenCalled();
  });

  it('calls tts.resume when Play button clicked while paused', () => {
    mockGetState.mockReturnValue({
      playbackState: 'paused',
      currentVoiceURI: '',
      rate: 1,
      volume: 1,
      progress: 0.3,
      currentCharIndex: 6,
      totalChars: 20,
    });
    render(<TtsPanel isOpen={true} onClose={mockOnClose} editor={mockEditor} />);
    fireEvent.click(screen.getByTitle('Resume'));
    expect(mockResume).toHaveBeenCalled();
  });

  it('calls tts.stop when Stop button clicked', () => {
    mockGetState.mockReturnValue({
      playbackState: 'playing',
      currentVoiceURI: '',
      rate: 1,
      volume: 1,
      progress: 0.5,
      currentCharIndex: 10,
      totalChars: 20,
    });
    render(<TtsPanel isOpen={true} onClose={mockOnClose} editor={mockEditor} />);
    fireEvent.click(screen.getByTitle('Stop'));
    expect(mockStop).toHaveBeenCalled();
  });

  it('calls tts.setVoice when voice selection changes', () => {
    render(<TtsPanel isOpen={true} onClose={mockOnClose} editor={mockEditor} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'v2' } });
    expect(mockSetVoice).toHaveBeenCalledWith('v2');
  });

  it('displays default voice option when no voices available', () => {
    mockGetVoices.mockReturnValue([]);
    render(<TtsPanel isOpen={true} onClose={mockOnClose} editor={mockEditor} />);
    expect(screen.getByText('Default voice')).toBeInTheDocument();
  });

  it('updates status when stateChange event fires', () => {
    render(<TtsPanel isOpen={true} onClose={mockOnClose} editor={mockEditor} />);
    // Fire a stateChange event to simulate playback starting
    const stateCallbacks = capturedCallbacks['stateChange'] || [];
    expect(stateCallbacks.length).toBeGreaterThan(0);
    act(() => {
      for (const cb of stateCallbacks) {
        cb({
          playbackState: 'playing',
          currentVoiceURI: '',
          rate: 1,
          volume: 1,
          progress: 0.45,
          currentCharIndex: 45,
          totalChars: 100,
        });
      }
    });
    expect(screen.getByText('Reading... (45%)')).toBeInTheDocument();
  });

  it('shows rate value on the speed slider', () => {
    mockGetState.mockReturnValue({
      playbackState: 'idle',
      currentVoiceURI: '',
      rate: 1.5,
      volume: 1,
      progress: 0,
      currentCharIndex: 0,
      totalChars: 0,
    });
    render(<TtsPanel isOpen={true} onClose={mockOnClose} editor={mockEditor} />);
    expect(screen.getByText('1.5x')).toBeInTheDocument();
  });
});
