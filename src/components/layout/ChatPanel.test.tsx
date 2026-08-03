// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import * as chatService from '../../utils/chatService';
import ChatPanel from './ChatPanel';
import { useChatStore } from '../../store/useChatStore';
import { useDocStore } from '../../store/useDocStore';
import type { Editor } from '@tiptap/core';

// Mock scrollIntoView (not implemented in jsdom)
Element.prototype.scrollIntoView = vi.fn();

// Mock chatService
vi.mock('../../utils/chatService', () => ({
  healthcheck: vi.fn().mockResolvedValue(true),
  listModels: vi.fn().mockResolvedValue([
    { id: 'model-1', name: 'model-1', state: 'loaded' },
    { id: 'model-2', name: 'model-2', state: 'unloaded' },
  ]),
  sendMessage: vi.fn().mockResolvedValue('AI response'),
  loadModel: vi.fn(),
  unloadModel: vi.fn(),
  DEFAULT_BASE_URL: 'http://localhost:1234',
  DEFAULT_MODEL: 'google/gemma-4-e2b',
  DEFAULT_MAX_TOKENS: 65535,
  DEFAULT_TEMPERATURE: 0.7,
}));

describe('ChatPanel', () => {
  let mockEditor: Partial<Editor>;

  beforeEach(() => {
    localStorage.clear();

    // Reset chat store
    useChatStore.setState({
      isConnected: false,
      isChecking: false,
      connectionError: null,
      models: [],
      selectedModel: 'google/gemma-4-e2b',
      baseUrl: 'http://localhost:1234',
      maxTokens: 65535,
      temperature: 0.7,
      systemPrompt: 'You are a helpful assistant.',
      messages: [],
      isLoading: false,
      lastResponse: '',
    });

    // Create a mock editor
    mockEditor = {
      state: {
        selection: { from: 5, to: 5, empty: true },
        doc: { textBetween: vi.fn() },
      },
      chain: vi.fn().mockReturnThis(),
      focus: vi.fn().mockReturnThis(),
      insertContentAt: vi.fn().mockReturnThis(),
      run: vi.fn(),
    } as unknown as Partial<Editor>;

    useDocStore.setState({ editor: mockEditor as Editor });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<ChatPanel isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders chat panel when isOpen is true', () => {
    render(<ChatPanel isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Chat')).toBeInTheDocument();
  });

  it('shows model selector dropdown', () => {
    render(<ChatPanel isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByDisplayValue('google/gemma-4-e2b')).toBeInTheDocument();
  });

  it('shows empty state message when no messages', () => {
    render(<ChatPanel isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Start a conversation')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<ChatPanel isOpen={true} onClose={onClose} />);

    const closeButton = screen.getByTitle('Close chat');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('sends message when send button is clicked', async () => {
    render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

    const textarea = screen.getByPlaceholderText(/Type a message/);
    fireEvent.change(textarea, { target: { value: 'Hello AI' } });

    const sendButton = screen.getByTitle('Send message');
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(useChatStore.getState().messages).toHaveLength(2);
    });
  });

  it('does not send empty messages', async () => {
    render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

    const sendButton = screen.getByTitle('Send message');
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(useChatStore.getState().messages).toHaveLength(0);
    });
  });

  it('clears history when clear button is clicked', () => {
    useChatStore.setState({
      messages: [
        { role: 'user', content: 'test', timestamp: Date.now() },
        { role: 'assistant', content: 'response', timestamp: Date.now() },
      ],
    });

    render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);

    expect(useChatStore.getState().messages).toHaveLength(0);
  });

  it('displays messages in the conversation', () => {
    useChatStore.setState({
      messages: [
        { role: 'user', content: 'Hello', timestamp: Date.now() },
        { role: 'assistant', content: 'Hi there!', timestamp: Date.now() },
      ],
    });

    render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('bi-directional button: inserts last response when no selection', () => {
    useChatStore.setState({ lastResponse: 'AI generated text' });

    render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

    const bidirectionalButton = screen.getByText('↕ Editor ↔ Chat');
    fireEvent.click(bidirectionalButton);

    expect(mockEditor.chain).toHaveBeenCalled();
  });

  it('bi-directional button: shows status when no response to insert', () => {
    useChatStore.setState({ lastResponse: '' });

    render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

    const bidirectionalButton = screen.getByText('↕ Editor ↔ Chat');
    fireEvent.click(bidirectionalButton);

    expect(screen.getByText('No response to insert')).toBeInTheDocument();
  });

  it('toggles settings panel when settings button is clicked', () => {
    render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

    const settingsButton = screen.getByText('Settings').closest('button')!;
    fireEvent.click(settingsButton);

    expect(screen.getByText('Server URL')).toBeInTheDocument();
    expect(screen.getByText('Active System Prompt')).toBeInTheDocument();
  });

  it('shows template selector in settings', () => {
    render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

    const settingsButton = screen.getByText('Settings').closest('button')!;
    fireEvent.click(settingsButton);

    // Should show template dropdown
    expect(screen.getByText('Prompt Templates')).toBeInTheDocument();
    // Should show the default template name in the dropdown
    expect(screen.getByText('General Assistant')).toBeInTheDocument();
  });

  it('shows pre-populated templates in dropdown', () => {
    render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

    const settingsButton = screen.getByText('Settings').closest('button')!;
    fireEvent.click(settingsButton);

    // Should have the executive analyst template
    expect(screen.getByText('Executive Analyst & Summarizer')).toBeInTheDocument();
    // Should have the fiction editor template
    expect(screen.getByText('Fiction Editor & Narrative Coach')).toBeInTheDocument();
  });

  it('allows selecting a different template', () => {
    render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

    const settingsButton = screen.getByText('Settings').closest('button')!;
    fireEvent.click(settingsButton);

    // Find the template selector (the one with the executive-analyst option)
    const selects = document.querySelectorAll('select');
    const templateSelect = Array.from(selects).find((s) =>
      Array.from(s.options).some((o) => o.value === 'executive-analyst')
    ) as HTMLSelectElement;
    expect(templateSelect).toBeDefined();

    fireEvent.change(templateSelect, { target: { value: 'executive-analyst' } });

    // The system prompt should now contain analyst content
    expect(useChatStore.getState().systemPrompt).toContain('Document Overview');
  });

  it('shows new template button', () => {
    render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

    const settingsButton = screen.getByText('Settings').closest('button')!;
    fireEvent.click(settingsButton);

    // Click the new template button (Plus icon)
    const newButton = screen.getByTitle('Create new template');
    expect(newButton).toBeInTheDocument();
    fireEvent.click(newButton);

    // Template editor should appear
    expect(screen.getByText('Template Name')).toBeInTheDocument();
    expect(screen.getByText('Prompt Content')).toBeInTheDocument();
  });

  it('shows connection status indicator', async () => {
    // Mock healthcheck to succeed
    vi.mocked(chatService.healthcheck).mockResolvedValue(true);

    render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(useChatStore.getState().isConnected).toBe(true);
    });
  });

  it('displays connection error banner when disconnected', async () => {
    // Mock healthcheck to hang (never resolve) so we control state manually
    vi.mocked(chatService.healthcheck).mockReturnValue(new Promise(() => {}));

    render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

    // Simulate a connection error (as would happen if server becomes unreachable)
    act(() => {
      useChatStore.setState({
        isConnected: false,
        connectionError: 'Cannot reach server',
      });
    });

    // Wait for re-render
    await waitFor(() => {
      expect(screen.getByText('Cannot reach server')).toBeInTheDocument();
    });
  });
});
