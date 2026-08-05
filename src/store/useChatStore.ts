// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { create } from 'zustand';
import type { ChatMessage, ModelInfo } from '../types/chat';
import type { ConfiguredProvider, ProviderConfig } from '../types/provider';
import { getProvider } from '../utils/providers/providerRegistry';
import { DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE } from './chatStoreDefaults';

const CHAT_STORAGE_KEY = 'SIMPLEDOCS_CHAT_STATE';

const DEFAULT_SYSTEM_PROMPT = `You are a helpful writing assistant integrated into simpledocs, a document editor.
You help users with writing, editing, formatting, and content creation.
Be concise, helpful, and focus on the user's document context.`;

interface ChatState {
  // ─── Provider Management ───────────────────────────────────────────────
  configuredProviders: ConfiguredProvider[];
  activeProviderId: string | null;

  // Connection state
  isConnected: boolean;
  isChecking: boolean;
  connectionError: string | null;

  // Model state
  models: ModelInfo[];

  // Chat config
  maxTokens: number;
  temperature: number;
  systemPrompt: string;

  // Conversation state
  messages: ChatMessage[];
  isLoading: boolean;
  lastResponse: string;

  // ─── Provider Actions ──────────────────────────────────────────────────
  addProvider: (providerId: string) => string;
  removeProvider: (instanceId: string) => void;
  setActiveProvider: (instanceId: string) => void;
  updateProviderConfig: (instanceId: string, config: Partial<ProviderConfig>) => void;
  setModel: (modelId: string) => void;
  setBaseUrl: (url: string) => void;

  // ─── Chat Actions ──────────────────────────────────────────────────────
  checkHealth: () => Promise<void>;
  checkHealthById: (instanceId: string) => Promise<boolean>;
  refreshModels: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  setTemperature: (temp: number) => void;
  setSystemPrompt: (prompt: string) => void;
  clearHistory: () => void;
  insertLastResponseAtCursor: () => string | null;
}

interface PersistedState {
  configuredProviders: ConfiguredProvider[];
  activeProviderId: string | null;
  messages: ChatMessage[];
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
}

/**
 * Get the currently active provider instance.
 */
function getActiveProvider(state: ChatState): ConfiguredProvider | null {
  if (!state.activeProviderId) return null;
  return state.configuredProviders.find((p) => p.id === state.activeProviderId) ?? null;
}

const loadPersistedState = (): Partial<PersistedState> => {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as PersistedState;
    }
  } catch {
    // ignore parse errors
  }
  return {};
};

/**
 * Migrate old single-config state to new multi-provider format.
 * Previously the store had: baseUrl, selectedModel, etc.
 * Now we create a ConfiguredProvider instance for the existing LM Studio setup.
 */
function migrateOldState(persisted: Partial<PersistedState>): Partial<PersistedState> {
  // Already migrated — has configuredProviders
  if (persisted.configuredProviders && persisted.configuredProviders.length > 0) {
    return persisted;
  }

  // Check if there's old-format data stored (pre-multi-provider)
  // We detect this by checking if there's a baseUrl in the raw JSON
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      // Old format had 'baseUrl' and 'selectedModel' at top level
      if (parsed.baseUrl || parsed.selectedModel) {
        const lmStudioProvider = getProvider('lmstudio');
        const instance: ConfiguredProvider = {
          id: crypto.randomUUID(),
          providerId: 'lmstudio',
          config: {
            baseUrl: (parsed.baseUrl as string) || 'http://localhost:1234',
          },
          selectedModel: (parsed.selectedModel as string) || lmStudioProvider?.getDefaultModel() || 'google/gemma-4-e2b',
          isActive: true,
        };

        return {
          configuredProviders: [instance],
          activeProviderId: instance.id,
          messages: parsed.messages as ChatMessage[],
          systemPrompt: parsed.systemPrompt as string,
          maxTokens: parsed.maxTokens as number,
          temperature: parsed.temperature as number,
        };
      }
    }
  } catch {
    // ignore parse errors
  }

  // No existing state — create default LM Studio instance
  const lmStudioProvider = getProvider('lmstudio');
  const instance: ConfiguredProvider = {
    id: crypto.randomUUID(),
    providerId: 'lmstudio',
    config: lmStudioProvider?.getDefaultConfig() || { baseUrl: 'http://localhost:1234' },
    selectedModel: lmStudioProvider?.getDefaultModel() || 'google/gemma-4-e2b',
    isActive: true,
  };

  return {
    configuredProviders: [instance],
    activeProviderId: instance.id,
  };
}

const persisted = migrateOldState(loadPersistedState());

/**
 * Rough token count heuristic.
 * English text averages ~4 characters per token.
 * Used to estimate context window usage.
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Trim messages to fit within maxTokens context window.
 * Keeps system prompt + most recent messages that fit.
 */
function trimMessagesToContext(
  messages: ChatMessage[],
  systemPrompt: string,
  maxTokens: number
): ChatMessage[] {
  const systemTokens = estimateTokenCount(systemPrompt);
  let remainingTokens = maxTokens - systemTokens;

  // Keep most recent messages first (reverse, then reverse back)
  const result: ChatMessage[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const tokens = estimateTokenCount(msg.content);
    if (tokens <= remainingTokens) {
      result.unshift(msg);
      remainingTokens -= tokens;
    } else {
      break;
    }
  }

  return result;
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

const persistState = (state: ChatState) => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    const toSave: PersistedState = {
      configuredProviders: state.configuredProviders,
      activeProviderId: state.activeProviderId,
      messages: state.messages,
      systemPrompt: state.systemPrompt,
      maxTokens: state.maxTokens,
      temperature: state.temperature,
    };
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toSave));
  }, 500);
};

export const useChatStore = create<ChatState>((set, get) => ({
  // ─── Provider State ────────────────────────────────────────────────────
  configuredProviders: persisted.configuredProviders ?? [],
  activeProviderId: persisted.activeProviderId ?? null,

  // Connection state
  isConnected: false,
  isChecking: false,
  connectionError: null,

  // Model state
  models: [],

  // Chat config
  maxTokens: persisted.maxTokens ?? DEFAULT_MAX_TOKENS,
  temperature: persisted.temperature ?? DEFAULT_TEMPERATURE,
  systemPrompt: persisted.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,

  // Conversation state
  messages: persisted.messages ?? [],
  isLoading: false,
  lastResponse: '',

  // ─── Provider Actions ──────────────────────────────────────────────────
  addProvider: (providerId: string) => {
    const provider = getProvider(providerId);
    if (!provider) return '';

    const instance: ConfiguredProvider = {
      id: crypto.randomUUID(),
      providerId,
      config: provider.getDefaultConfig(),
      selectedModel: provider.getDefaultModel(),
      isActive: false,
    };

    set((state) => ({
      configuredProviders: [...state.configuredProviders, instance],
    }));
    persistState(get());
    return instance.id;
  },

  removeProvider: (instanceId: string) => {
    set((state) => {
      const filtered = state.configuredProviders.filter((p) => p.id !== instanceId);
      let newActiveId = state.activeProviderId;

      // If we removed the active provider, activate another one
      if (state.activeProviderId === instanceId) {
        newActiveId = filtered.length > 0 ? filtered[0].id : null;
        if (newActiveId) {
          filtered.forEach((p) => {
            if (p.id === newActiveId) {
              p.isActive = true;
            }
          });
        }
      }

      return {
        configuredProviders: filtered,
        activeProviderId: newActiveId,
        isConnected: newActiveId ? state.isConnected : false,
      };
    });
    persistState(get());
  },

  setActiveProvider: (instanceId: string) => {
    set((state) => ({
      configuredProviders: state.configuredProviders.map((p) => ({
        ...p,
        isActive: p.id === instanceId,
      })),
      activeProviderId: instanceId,
      isConnected: false,
      connectionError: null,
      models: [],
    }));
    persistState(get());
    // Trigger healthcheck for new active provider
    get().checkHealth();
    get().refreshModels();
  },

  updateProviderConfig: (instanceId: string, config: Partial<ProviderConfig>) => {
    set((state) => ({
      configuredProviders: state.configuredProviders.map((p) => {
        if (p.id !== instanceId) return p;
        return { ...p, config: { ...p.config, ...config } as ProviderConfig };
      }),
    }));
    persistState(get());
    // Re-check health when config changes
    get().checkHealth();
  },

  setModel: (modelId: string) => {
    set((state) => ({
      configuredProviders: state.configuredProviders.map((p) => {
        if (p.id !== state.activeProviderId) return p;
        return { ...p, selectedModel: modelId };
      }),
    }));
    persistState(get());
  },

  // Legacy setter — updates baseUrl for LM Studio active provider
  setBaseUrl: (url: string) => {
    const active = getActiveProvider(get());
    if (active && active.providerId === 'lmstudio') {
      get().updateProviderConfig(active.id, { baseUrl: url } as Partial<ProviderConfig>);
    }
  },

  // ─── Chat Actions ──────────────────────────────────────────────────────
  checkHealth: async () => {
    const active = getActiveProvider(get());
    if (!active) {
      set({ isConnected: false, connectionError: 'No provider configured' });
      return;
    }

    const provider = getProvider(active.providerId);
    if (!provider) return;

    set({ isChecking: true, connectionError: null });
    try {
      const connected = await provider.healthcheck(active.config);
      set({ isConnected: connected, isChecking: false });
      if (!connected) {
        set({ connectionError: `Cannot reach ${provider.name} server` });
      }
    } catch (err) {
      set({
        isConnected: false,
        isChecking: false,
        connectionError: err instanceof Error ? err.message : 'Healthcheck failed',
      });
    }
  },

  checkHealthById: async (instanceId: string): Promise<boolean> => {
    const instance = get().configuredProviders.find((p) => p.id === instanceId);
    if (!instance) return false;

    const provider = getProvider(instance.providerId);
    if (!provider) return false;

    try {
      return await provider.healthcheck(instance.config);
    } catch {
      return false;
    }
  },

  refreshModels: async () => {
    const active = getActiveProvider(get());
    if (!active) return;

    const provider = getProvider(active.providerId);
    if (!provider) return;

    try {
      const models = await provider.listModels(active.config);
      set({ models });
    } catch (err) {
      set({
        connectionError: err instanceof Error ? err.message : 'Failed to list models',
      });
    }
  },

  sendMessage: async (content: string) => {
    if (!content.trim()) return;

    const active = getActiveProvider(get());
    if (!active) {
      set({ connectionError: 'No provider configured. Add a provider in settings.' });
      return;
    }

    const provider = getProvider(active.providerId);
    if (!provider) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    // Add user message immediately
    const updatedMessages = [...get().messages, userMessage];
    set({ messages: updatedMessages, isLoading: true, connectionError: null });
    persistState(get());

    try {
      // Build the full messages array with system prompt
      const systemMsg: ChatMessage = {
        role: 'system',
        content: get().systemPrompt,
        timestamp: Date.now(),
      };

      // Trim to context window
      const contextMessages = trimMessagesToContext(
        updatedMessages,
        get().systemPrompt,
        get().maxTokens
      );

      const fullMessages = [systemMsg, ...contextMessages];

      const responseText = await provider.sendMessage(
        fullMessages,
        active.config,
        active.selectedModel,
        get().maxTokens,
        get().temperature
      );

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: responseText,
        timestamp: Date.now(),
      };

      const finalMessages = [...get().messages, assistantMessage];
      set({
        messages: finalMessages,
        isLoading: false,
        lastResponse: responseText,
        isConnected: true,
      });
      persistState(get());
    } catch (err) {
      set({
        isLoading: false,
        isConnected: false,
        connectionError: err instanceof Error ? err.message : 'Failed to send message',
      });
    }
  },

  setTemperature: (temp: number) => {
    set({ temperature: temp });
    persistState(get());
  },

  setSystemPrompt: (prompt: string) => {
    set({ systemPrompt: prompt });
    persistState(get());
  },

  clearHistory: () => {
    set({ messages: [], lastResponse: '' });
    persistState(get());
  },

  insertLastResponseAtCursor: () => {
    return get().lastResponse || null;
  },
}));
