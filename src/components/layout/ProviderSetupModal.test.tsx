// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProviderSetupModal from './ProviderSetupModal';
import { useChatStore } from '../../store/useChatStore';
import type { LlmProvider } from '../../types/provider';

// Hoist mock providers and createMockProvider so they're available in the vi.mock factory
const { mockLmStudioProvider, mockGeminiProvider } = vi.hoisted(() => {
  const createMockProvider = (overrides: Partial<LlmProvider> & { id: string; name: string; icon: string }): LlmProvider => ({
    id: overrides.id,
    name: overrides.name,
    icon: overrides.icon,
    description: overrides.description ?? '',
    hasFreeTier: overrides.hasFreeTier ?? true,
    healthcheck: overrides.healthcheck ?? vi.fn().mockResolvedValue(true),
    listModels: overrides.listModels ?? vi.fn().mockResolvedValue([]),
    sendMessage: overrides.sendMessage ?? vi.fn().mockResolvedValue(''),
    getDefaultConfig: overrides.getDefaultConfig ?? (() => ({ baseUrl: 'http://localhost:1234' })),
    getDefaultModel: overrides.getDefaultModel ?? (() => 'google/gemma-4-e2b'),
    validateConfig: overrides.validateConfig ?? (() => ({ valid: true as const })),
    getAvailableModels: overrides.getAvailableModels ?? (() => []),
  });

  const mockLmStudioProvider = createMockProvider({
    id: 'lmstudio',
    name: 'LM Studio',
    icon: 'Monitor',
    description: 'Local server with full privacy.',
    healthcheck: vi.fn().mockResolvedValue(true),
    listModels: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn().mockResolvedValue(''),
    getDefaultConfig: () => ({ baseUrl: 'http://localhost:1234' }),
    getDefaultModel: () => 'google/gemma-4-e2b',
    getAvailableModels: () => [{ id: 'google/gemma-4-e2b', name: 'Gemma 4 E2B', recommended: true }],
  });

  const mockGeminiProvider = createMockProvider({
    id: 'gemini',
    name: 'Google Gemini',
    icon: 'Sparkles',
    description: 'Cloud API with free tier.',
    healthcheck: vi.fn().mockResolvedValue(true),
    listModels: vi.fn().mockResolvedValue([
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', state: 'unknown' },
    ]),
    sendMessage: vi.fn().mockResolvedValue(''),
    getDefaultConfig: () => ({ apiKey: '' }),
    getDefaultModel: () => 'gemini-2.5-flash',
    getAvailableModels: () => [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', recommended: true },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    ],
  });

  return { mockLmStudioProvider, mockGeminiProvider };
});

// Mock provider registry
vi.mock('../../utils/providers/providerRegistry', () => ({
  getProvider: vi.fn((id: string) => {
    if (id === 'lmstudio') return mockLmStudioProvider;
    if (id === 'gemini') return mockGeminiProvider;
    return undefined;
  }),
  getAllProviders: vi.fn().mockReturnValue([
    mockLmStudioProvider,
    mockGeminiProvider,
  ]),
}));

describe('ProviderSetupModal', () => {
  beforeEach(() => {
    localStorage.clear();
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
      models: [],
      maxTokens: 65535,
      temperature: 0.7,
      systemPrompt: 'You are a helpful assistant.',
      messages: [],
      isLoading: false,
      lastResponse: '',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<ProviderSetupModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows provider selection when opened', () => {
    render(<ProviderSetupModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Add Provider')).toBeInTheDocument();
    expect(screen.getByText('LM Studio')).toBeInTheDocument();
    expect(screen.getByText('Google Gemini')).toBeInTheDocument();
  });

  it('shows free tier badges', () => {
    render(<ProviderSetupModal isOpen={true} onClose={vi.fn()} />);
    const freeBadges = screen.getAllByText('Free');
    expect(freeBadges.length).toBeGreaterThanOrEqual(2);
  });

  /** Helper: click a provider card by finding the button containing the provider name */
  const clickProviderCard = (name: string) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const card = buttons.find((btn) => btn.textContent?.includes(name));
    if (!card) throw new Error(`Provider card "${name}" not found`);
    fireEvent.click(card);
  };

  it('navigates to configure step when provider is selected', () => {
    render(<ProviderSetupModal isOpen={true} onClose={vi.fn()} />);

    clickProviderCard('Google Gemini');

    // Should show configure step
    expect(screen.getByText('How to get a Gemini API key:')).toBeInTheDocument();
  });

  it('shows API key input in Gemini configure step', () => {
    render(<ProviderSetupModal isOpen={true} onClose={vi.fn()} />);

    clickProviderCard('Google Gemini');

    // Should have API key input (password field)
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    expect(passwordInputs.length).toBeGreaterThan(0);
  });

  it('validates Gemini API key format', async () => {
    render(<ProviderSetupModal isOpen={true} onClose={vi.fn()} />);

    clickProviderCard('Google Gemini');

    // Wait for the API key input to appear
    await waitFor(() => {
      const input = document.querySelector('input[type="password"]');
      expect(input).toBeTruthy();
    });

    const apiKeyInput = document.querySelector('input[type="password"]') as HTMLInputElement;

    // Type an invalid key (too short)
    fireEvent.change(apiKeyInput, { target: { value: 'short' } });

    // Should show validation error about key being too short
    expect(await screen.findByText(/too short/i)).toBeInTheDocument();
  });

  it('toggles API key visibility', () => {
    render(<ProviderSetupModal isOpen={true} onClose={vi.fn()} />);

    clickProviderCard('Google Gemini');

    // Initially password type
    let input = document.querySelector('input[type="password"]');
    expect(input).toBeTruthy();

    // Find the eye toggle button - it's the button with Eye/EyeOff icon
    const buttons = Array.from(document.querySelectorAll('button'));
    const eyeButton = buttons.find((btn) => {
      const svg = btn.querySelector('svg');
      return svg && (svg.classList.contains('lucide-eye') || svg.classList.contains('lucide-eye-off'));
    });

    expect(eyeButton).toBeTruthy();
    fireEvent.click(eyeButton!);

    // Now should be text type
    input = document.querySelector('input[type="text"]');
    expect(input).toBeTruthy();
  });

  it('shows LM Studio URL input when LM Studio is selected', () => {
    render(<ProviderSetupModal isOpen={true} onClose={vi.fn()} />);

    clickProviderCard('LM Studio');

    expect(screen.getByText('Server URL')).toBeInTheDocument();
    expect(screen.getByDisplayValue('http://localhost:1234')).toBeInTheDocument();
  });

  it('shows back button in configure step', () => {
    render(<ProviderSetupModal isOpen={true} onClose={vi.fn()} />);

    clickProviderCard('Google Gemini');

    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('goes back to select step when back is clicked', () => {
    render(<ProviderSetupModal isOpen={true} onClose={vi.fn()} />);

    clickProviderCard('Google Gemini');
    expect(screen.getByText('How to get a Gemini API key:')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText('Add Provider')).toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', () => {
    const onClose = vi.fn();
    render(<ProviderSetupModal isOpen={true} onClose={onClose} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<ProviderSetupModal isOpen={true} onClose={onClose} />);

    // Find the close button (the X icon button in the header)
    const buttons = Array.from(document.querySelectorAll('button'));
    const closeButton = buttons.find((btn) => {
      const svg = btn.querySelector('svg');
      return svg?.classList.contains('lucide-x');
    });
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);
    expect(onClose).toHaveBeenCalled();
  });
});
