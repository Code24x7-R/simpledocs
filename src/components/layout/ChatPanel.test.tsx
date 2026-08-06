// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ChatPanel from './ChatPanel';
import { useChatStore } from '../../store/useChatStore';
import { useDocStore } from '../../store/useDocStore';
import type { Editor } from '@tiptap/core';
import type { LlmProvider } from '../../types/provider';

// Mock scrollIntoView (not implemented in jsdom)
Element.prototype.scrollIntoView = vi.fn();

// Hoist createMockProvider so it's available in the vi.mock factory
const { createMockProvider } = vi.hoisted(() => {
  const createMockProvider = (overrides: Partial<LlmProvider> & { id: string; name: string; icon: string }): LlmProvider => ({
    id: overrides.id,
    name: overrides.name,
    icon: overrides.icon,
    description: overrides.description ?? '',
    hasFreeTier: overrides.hasFreeTier ?? true,
    healthcheck: overrides.healthcheck ?? vi.fn().mockResolvedValue(true),
    listModels: overrides.listModels ?? vi.fn().mockResolvedValue([]),
    sendMessage: overrides.sendMessage ?? vi.fn().mockResolvedValue(''),
    generateImage: overrides.generateImage ?? vi.fn().mockResolvedValue({
      base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      mimeType: 'image/png',
      caption: 'A generated test image',
    }),
    getDefaultConfig: overrides.getDefaultConfig ?? (() => ({ baseUrl: 'http://localhost:1234' })),
    getDefaultModel: overrides.getDefaultModel ?? (() => 'google/gemma-4-e2b'),
    validateConfig: overrides.validateConfig ?? (() => ({ valid: true as const })),
    getAvailableModels: overrides.getAvailableModels ?? (() => []),
  });
  return { createMockProvider };
});

// Mock provider registry
vi.mock('../../utils/providers/providerRegistry', () => ({
  getProvider: vi.fn((id: string) => {
    if (id === 'lmstudio') {
      return createMockProvider({
        id: 'lmstudio',
        name: 'LM Studio',
        icon: 'Monitor',
        description: 'Local server',
        healthcheck: vi.fn().mockResolvedValue(true),
        listModels: vi.fn().mockResolvedValue([
          { id: 'google/gemma-4-e2b', name: 'google/gemma-4-e2b', state: 'unknown' },
        ]),
        sendMessage: vi.fn().mockResolvedValue('AI response'),
        getDefaultConfig: () => ({ baseUrl: 'http://localhost:1234' }),
        getDefaultModel: () => 'google/gemma-4-e2b',
        getAvailableModels: () => [{ id: 'google/gemma-4-e2b', name: 'Gemma 4 E2B', recommended: true }],
      });
    }
    if (id === 'gemini') {
      return createMockProvider({
        id: 'gemini',
        name: 'Google Gemini',
        icon: 'Sparkles',
        description: 'Cloud API',
        healthcheck: vi.fn().mockResolvedValue(true),
        listModels: vi.fn().mockResolvedValue([
          { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', state: 'unknown' },
        ]),
        sendMessage: vi.fn().mockResolvedValue('AI response'),
        getDefaultConfig: () => ({ apiKey: '' }),
        getDefaultModel: () => 'gemini-2.5-flash',
        getAvailableModels: () => [{ id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', recommended: true }],
      });
    }
    return undefined;
  }),
  getAllProviders: vi.fn().mockReturnValue([
    { id: 'lmstudio', name: 'LM Studio', icon: 'Monitor', description: 'Local server', hasFreeTier: true },
    { id: 'gemini', name: 'Google Gemini', icon: 'Sparkles', description: 'Cloud API', hasFreeTier: true },
  ]),
}));

describe('ChatPanel', () => {
  let mockEditor: Partial<Editor>;

  beforeEach(() => {
    localStorage.clear();

    // Reset chat store
    useChatStore.setState({
      configuredProviders: [
        {
          id: 'test-lm-studio',
          providerId: 'lmstudio',
          config: { baseUrl: 'http://localhost:1234' },
          selectedModel: 'google/gemma-4-e2b',
          isActive: true,
        },
      ],
      activeProviderId: 'test-lm-studio',
      isConnected: false,
      isChecking: false,
      connectionError: null,
      models: [
        { id: 'google/gemma-4-e2b', name: 'google/gemma-4-e2b', state: 'unknown' },
      ],
      maxTokens: 65535,
      temperature: 0.7,
      systemPrompt: 'You are a helpful assistant.',
      messages: [],
      isLoading: false,
      lastResponse: '',
      lastGeneratedImage: null,
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
      setImage: vi.fn().mockReturnThis(),
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

  it('shows provider selector dropdown', () => {
    render(<ChatPanel isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByDisplayValue('LM Studio')).toBeInTheDocument();
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
    render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(useChatStore.getState().isConnected).toBe(true);
    });
  });

  it('displays connection error banner when disconnected', async () => {
    // Mock healthcheck to hang (never resolve) so we control state manually
    const { getProvider } = await import('../../utils/providers/providerRegistry');
    vi.mocked(getProvider).mockReturnValue(
      createMockProvider({
        id: 'lmstudio',
        name: 'LM Studio',
        icon: 'Monitor',
        healthcheck: vi.fn().mockReturnValue(new Promise(() => {})),
        listModels: vi.fn().mockResolvedValue([]),
        sendMessage: vi.fn().mockResolvedValue(''),
        getDefaultConfig: () => ({ baseUrl: 'http://localhost:1234' }),
        getDefaultModel: () => 'google/gemma-4-e2b',
      })
    );

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

  it('dismisses error banner when X is clicked', async () => {
    render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

    // Simulate an error occurring during use (after mount)
    act(() => {
      useChatStore.setState({
        isConnected: false,
        connectionError: 'Rate limit exceeded. Please wait a moment before trying again.',
      });
    });

    expect(screen.getByText(/Rate limit exceeded/)).toBeInTheDocument();

    // Click dismiss button
    const dismissButton = screen.getByTitle('Dismiss');
    fireEvent.click(dismissButton);

    // Error banner should be gone
    expect(useChatStore.getState().connectionError).toBeNull();
  });

  it('shows add provider button', () => {
    render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

    const addButton = screen.getByTitle('Add provider');
    expect(addButton).toBeInTheDocument();
  });

  it('shows remove provider button when a provider is active', () => {
    render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

    const removeButton = screen.getByTitle('Remove provider');
    expect(removeButton).toBeInTheDocument();
  });

  it('disables remove provider button when no provider is active', () => {
    useChatStore.setState({ activeProviderId: null });

    render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

    const removeButton = screen.getByTitle('Remove provider');
    expect(removeButton).toBeDisabled();
  });

  it('removes the active provider when remove button is clicked and confirmed', () => {
    // Set up two providers so one remains after removal
    useChatStore.setState({
      configuredProviders: [
        {
          id: 'provider-1',
          providerId: 'lmstudio',
          config: { baseUrl: 'http://localhost:1234' },
          selectedModel: 'google/gemma-4-e2b',
          isActive: true,
        },
        {
          id: 'provider-2',
          providerId: 'gemini',
          config: { apiKey: 'test-key' },
          selectedModel: 'gemini-3.6-flash',
          isActive: false,
        },
      ],
      activeProviderId: 'provider-1',
      messages: [
        { role: 'user', content: 'test', timestamp: Date.now() },
        { role: 'assistant', content: 'response', timestamp: Date.now() },
      ],
    });

    // Mock window.confirm to return true
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

    const removeButton = screen.getByTitle('Remove provider');
    fireEvent.click(removeButton);

    // Provider should be removed and history cleared
    const state = useChatStore.getState();
    expect(state.configuredProviders).toHaveLength(1);
    expect(state.configuredProviders[0].id).toBe('provider-2');
    expect(state.messages).toHaveLength(0);
    expect(confirmSpy).toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('does not remove provider when confirm is cancelled', () => {
    useChatStore.setState({
      configuredProviders: [
        {
          id: 'provider-1',
          providerId: 'lmstudio',
          config: { baseUrl: 'http://localhost:1234' },
          selectedModel: 'google/gemma-4-e2b',
          isActive: true,
        },
      ],
      activeProviderId: 'provider-1',
    });

    // Mock window.confirm to return false
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

    const removeButton = screen.getByTitle('Remove provider');
    fireEvent.click(removeButton);

    // Provider should still be there
    expect(useChatStore.getState().configuredProviders).toHaveLength(1);
    expect(confirmSpy).toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  describe('image generation', () => {
    beforeEach(() => {
      // Switch to gemini provider for image generation tests
      useChatStore.setState({
        configuredProviders: [
          {
            id: 'test-gemini',
            providerId: 'gemini',
            config: { apiKey: 'AIzaTest123' },
            selectedModel: 'gemini-3.6-flash',
            isActive: true,
          },
        ],
        activeProviderId: 'test-gemini',
        models: [
          { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', state: 'unknown' },
        ],
      });
    });

    it('shows image generation button when gemini is active', () => {
      render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

      const imageButton = screen.getByTitle('Generate image with Gemini Nano Banana (free tier: ~500/day)');
      expect(imageButton).toBeInTheDocument();
    });

    it('shows aspect ratio selector when gemini is active', () => {
      render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText('Aspect:')).toBeInTheDocument();
      expect(screen.getByText('1K · Nano Banana')).toBeInTheDocument();
    });

    it('does not show aspect ratio selector for non-gemini providers', () => {
      useChatStore.setState({
        configuredProviders: [
          {
            id: 'test-lm-studio',
            providerId: 'lmstudio',
            config: { baseUrl: 'http://localhost:1234' },
            selectedModel: 'google/gemma-4-e2b',
            isActive: true,
          },
        ],
        activeProviderId: 'test-lm-studio',
      });

      render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

      expect(screen.queryByText('Aspect:')).not.toBeInTheDocument();
      expect(screen.queryByText('1K · Nano Banana')).not.toBeInTheDocument();
    });

    it('calls generateImage when image button is clicked', async () => {
      render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

      const textarea = screen.getByPlaceholderText(/Type a message/);
      fireEvent.change(textarea, { target: { value: 'A cat on a keyboard' } });

      const imageButton = screen.getByTitle('Generate image with Gemini Nano Banana (free tier: ~500/day)');
      fireEvent.click(imageButton);

      await waitFor(() => {
        const state = useChatStore.getState();
        expect(state.messages).toHaveLength(2);
        expect(state.messages[0].content).toBe('[Image] A cat on a keyboard');
      });
    });

    it('displays generated image in chat area', () => {
      useChatStore.setState({
        lastGeneratedImage: {
          base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          mimeType: 'image/png',
          caption: 'A generated test image',
        },
      });

      render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

      // Should show the image
      const img = screen.getByAltText('A generated test image');
      expect(img).toBeInTheDocument();
      expect(img.getAttribute('src')).toContain('data:image/png;base64,');

      // Should show caption
      expect(screen.getByText('A generated test image')).toBeInTheDocument();

      // Should show action buttons
      expect(screen.getByText('Insert')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('inserts generated image into editor when Insert is clicked', () => {
      useChatStore.setState({
        lastGeneratedImage: {
          base64: 'abc123',
          mimeType: 'image/png',
          caption: 'Test image',
        },
      });

      render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

      const insertButton = screen.getByText('Insert');
      fireEvent.click(insertButton);

      expect(mockEditor.chain).toHaveBeenCalled();
    });

    it('disables image button when input is empty', () => {
      render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

      const imageButton = screen.getByTitle('Generate image with Gemini Nano Banana (free tier: ~500/day)');
      expect(imageButton).toBeDisabled();
    });

    it('disables image button when no provider is active', () => {
      useChatStore.setState({ activeProviderId: null });

      render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

      const imageButton = screen.getByTitle('Generate image with Gemini Nano Banana (free tier: ~500/day)');
      expect(imageButton).toBeDisabled();
    });
  });
});
