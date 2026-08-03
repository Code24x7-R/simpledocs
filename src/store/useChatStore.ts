// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { create } from 'zustand';
import type { ChatMessage, ModelInfo } from '../types/chat';
import {
  healthcheck,
  listModels,
  sendMessage as apiSendMessage,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TEMPERATURE,
} from '../utils/chatService';

const CHAT_STORAGE_KEY = 'SIMPLEDOCS_CHAT_STATE';

const DEFAULT_SYSTEM_PROMPT = `You are a helpful writing assistant integrated into simpledocs, a document editor.
You help users with writing, editing, formatting, and content creation.
Be concise, helpful, and focus on the user's document context.`;

interface ChatState {
  // Connection state
  isConnected: boolean;
  isChecking: boolean;
  connectionError: string | null;

  // Model state
  models: ModelInfo[];
  selectedModel: string;

  // Chat config
  baseUrl: string;
  maxTokens: number;
  temperature: number;
  systemPrompt: string;

  // Conversation state
  messages: ChatMessage[];
  isLoading: boolean;
  lastResponse: string;

  // Healthcheck
  checkHealth: () => Promise<void>;
  refreshModels: () => Promise<void>;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  setModel: (modelId: string) => void;
  setBaseUrl: (url: string) => void;
  setTemperature: (temp: number) => void;
  setSystemPrompt: (prompt: string) => void;
  clearHistory: () => void;
  insertLastResponseAtCursor: () => string | null;
}

interface PersistedState {
  selectedModel: string;
  baseUrl: string;
  messages: ChatMessage[];
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
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

const persisted = loadPersistedState();

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
      selectedModel: state.selectedModel,
      baseUrl: state.baseUrl,
      messages: state.messages,
      systemPrompt: state.systemPrompt,
      maxTokens: state.maxTokens,
      temperature: state.temperature,
    };
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toSave));
  }, 500);
};

export const useChatStore = create<ChatState>((set, get) => ({
  // Connection state
  isConnected: false,
  isChecking: false,
  connectionError: null,

  // Model state
  models: [],
  selectedModel: persisted.selectedModel ?? DEFAULT_MODEL,

  // Chat config
  baseUrl: persisted.baseUrl ?? DEFAULT_BASE_URL,
  maxTokens: persisted.maxTokens ?? DEFAULT_MAX_TOKENS,
  temperature: persisted.temperature ?? DEFAULT_TEMPERATURE,
  systemPrompt: persisted.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,

  // Conversation state
  messages: persisted.messages ?? [],
  isLoading: false,
  lastResponse: '',

  // Healthcheck
  checkHealth: async () => {
    set({ isChecking: true, connectionError: null });
    try {
      const connected = await healthcheck(get().baseUrl);
      set({ isConnected: connected, isChecking: false });
      if (!connected) {
        set({ connectionError: 'Cannot reach LM Studio server' });
      }
    } catch (err) {
      set({
        isConnected: false,
        isChecking: false,
        connectionError: err instanceof Error ? err.message : 'Healthcheck failed',
      });
    }
  },

  refreshModels: async () => {
    try {
      const models = await listModels(get().baseUrl);
      set({ models });
    } catch (err) {
      set({
        connectionError: err instanceof Error ? err.message : 'Failed to list models',
      });
    }
  },

  // Send a message and get a response
  sendMessage: async (content: string) => {
    if (!content.trim()) return;

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

      const responseText = await apiSendMessage(fullMessages, {
        baseUrl: get().baseUrl,
        model: get().selectedModel,
        maxTokens: get().maxTokens,
        temperature: get().temperature,
      });

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

  // Setters
  setModel: (modelId: string) => {
    set({ selectedModel: modelId });
    persistState(get());
  },

  setBaseUrl: (url: string) => {
    set({ baseUrl: url });
    persistState(get());
    // Re-check health when URL changes
    get().checkHealth();
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
