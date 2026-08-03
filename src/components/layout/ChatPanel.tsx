// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Send,
  Trash2,
  RefreshCw,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  ArrowLeftRight,
  Copy,
  Settings,
  FileText,
  Plus,
  Save,
  Pencil,
} from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import { useDocStore } from '../../store/useDocStore';
import { markdownToHtml, containsMarkdown } from '../../utils/markdownToHtml';
import {
  loadTemplates,
  saveTemplates,
  createTemplate,
} from '../../utils/promptTemplates';
import type { PromptTemplate } from '../../types/promptTemplate';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_SELECTION_LENGTH = 200;

/**
 * ChatPanel — sidebar chatbot integrated with LM Studio API.
 *
 * Features:
 * - Model selector dropdown (populated from /v1/models)
 * - Connection status indicator (healthcheck via /v1/models)
 * - Session memory (conversation history persisted to localStorage)
 * - Context window up to 65535 tokens
 * - Bi-directional copy/paste button:
 *   - If editor has selection (≤200 chars) → paste into chat input
 *   - Else → insert last response at cursor (with MD→HTML conversion)
 * - System prompt templates (pre-populated + custom)
 */
export default function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
  const { editor } = useDocStore();
  const {
    isConnected,
    isChecking,
    connectionError,
    models,
    selectedModel,
    baseUrl,
    messages,
    isLoading,
    lastResponse,
    temperature,
    systemPrompt,
    checkHealth,
    refreshModels,
    sendMessage,
    setModel,
    setBaseUrl,
    setTemperature,
    setSystemPrompt,
    clearHistory,
  } = useChatStore();

  const [inputValue, setInputValue] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Template state
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('default');
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateContent, setTemplateContent] = useState('');

  // Load templates on mount
  useEffect(() => {
    if (isOpen) {
      const loaded = loadTemplates();
      setTemplates(loaded);
    }
  }, [isOpen]);

  // Healthcheck on mount and when panel opens
  useEffect(() => {
    if (isOpen) {
      checkHealth();
      refreshModels();
    }
  }, [isOpen, checkHealth, refreshModels]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Show transient status messages
  const showStatus = useCallback((msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  }, []);

  // Handle send
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    const text = inputValue.trim();
    setInputValue('');
    await sendMessage(text);
  };

  // Handle Enter to send (Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Bi-directional button handler
  const handleBidirectionalAction = () => {
    if (!editor) {
      showStatus('Editor not available');
      return;
    }

    const { selection } = editor.state;

    // Check if there's a selection in the editor
    if (!selection.empty) {
      const selectedText = editor.state.doc.textBetween(selection.from, selection.to);

      if (selectedText.length <= MAX_SELECTION_LENGTH) {
        // Paste selected text into chat input
        setInputValue(selectedText);
        showStatus(`Pasted ${selectedText.length} chars to input`);
        // Focus the textarea
        textareaRef.current?.focus();
        return;
      } else {
        showStatus(`Selection too long (${selectedText.length} > ${MAX_SELECTION_LENGTH} chars)`);
        return;
      }
    }

    // No selection (or selection too long) → insert last response at cursor
    if (lastResponse) {
      const { from } = selection;
      // Convert markdown to HTML for proper formatting in the editor
      const contentToInsert = containsMarkdown(lastResponse)
        ? markdownToHtml(lastResponse)
        : lastResponse;
      editor.chain().focus().insertContentAt(from, contentToInsert).run();
      showStatus('Inserted last response at cursor');
    } else {
      showStatus('No response to insert');
    }
  };

  // Copy last response to clipboard
  const handleCopyLastResponse = async () => {
    if (!lastResponse) {
      showStatus('No response to copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(lastResponse);
      showStatus('Copied to clipboard');
    } catch {
      showStatus('Failed to copy');
    }
  };

  // Template handlers
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSystemPrompt(template.content);
      showStatus(`Loaded template: ${template.name}`);
    }
  };

  const handleNewTemplate = () => {
    setEditingTemplate(null);
    setTemplateName('New Template');
    setTemplateContent('');
    setShowTemplateEditor(true);
  };

  const handleEditTemplate = (template: PromptTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateContent(template.content);
    setShowTemplateEditor(true);
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim() || !templateContent.trim()) {
      showStatus('Template name and content required');
      return;
    }

    let updatedTemplates: PromptTemplate[];

    if (editingTemplate) {
      // Update existing template
      updatedTemplates = templates.map((t) =>
        t.id === editingTemplate.id
          ? { ...t, name: templateName.trim(), content: templateContent, updatedAt: Date.now() }
          : t
      );
      showStatus('Template updated');
    } else {
      // Create new template
      const newTemplate = createTemplate(templateName.trim(), templateContent);
      updatedTemplates = [...templates, newTemplate];
      setSelectedTemplateId(newTemplate.id);
      setSystemPrompt(newTemplate.content);
      showStatus('Template created');
    }

    setTemplates(updatedTemplates);
    saveTemplates(updatedTemplates);
    setShowTemplateEditor(false);
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateContent('');
  };

  const handleDeleteTemplate = (templateId: string) => {
    // Don't allow deleting the default template
    if (templateId === 'default') {
      showStatus('Cannot delete default template');
      return;
    }

    const template = templates.find((t) => t.id === templateId);
    const updatedTemplates = templates.filter((t) => t.id !== templateId);
    setTemplates(updatedTemplates);
    saveTemplates(updatedTemplates);

    // If we deleted the selected template, revert to default
    if (selectedTemplateId === templateId) {
      setSelectedTemplateId('default');
      const defaultTpl = updatedTemplates.find((t) => t.id === 'default');
      if (defaultTpl) {
        setSystemPrompt(defaultTpl.content);
      }
    }

    showStatus(`Deleted template: ${template?.name ?? templateId}`);
  };

  const handleCancelTemplateEdit = () => {
    setShowTemplateEditor(false);
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateContent('');
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 h-full border-l border-gray-200 bg-white flex flex-col shadow-lg shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-800">Chat</span>
          {/* Connection status indicator */}
          {isChecking ? (
            <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" />
          ) : isConnected ? (
            <span title="Connected">
              <Wifi className="w-3 h-3 text-green-500" />
            </span>
          ) : (
            <span title="Disconnected">
              <WifiOff className="w-3 h-3 text-red-400" />
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded"
          title="Close chat"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Connection error banner */}
      {connectionError && (
        <div className="px-3 py-1.5 bg-red-50 border-b border-red-100 text-xs text-red-600 flex items-center justify-between">
          <span className="truncate">{connectionError}</span>
          <button
            onClick={() => checkHealth()}
            className="ml-2 text-red-700 underline hover:no-underline shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Model selector */}
      <div className="px-3 py-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <select
            value={selectedModel}
            onChange={(e) => setModel(e.target.value)}
            className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
            title="Select model"
          >
            {models.length === 0 && (
              <option value={selectedModel}>{selectedModel}</option>
            )}
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} {model.state === 'loaded' ? '✓' : ''}
              </option>
            ))}
          </select>
          <button
            onClick={() => refreshModels()}
            className="p-1 hover:bg-gray-100 rounded"
            title="Refresh models"
          >
            <RefreshCw className="w-3 h-3 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Settings toggle */}
      <div className="px-3 py-1 border-b border-gray-100">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
        >
          <Settings className="w-3 h-3" />
          Settings
          {showSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="px-3 py-2 border-b border-gray-100 space-y-2 bg-gray-50 max-h-[50vh] overflow-y-auto">
          {/* Base URL */}
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Server URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:1234"
              className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">
              Temperature: {temperature.toFixed(1)}
            </label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-1"
            />
          </div>

          {/* Template selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-500 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Prompt Templates
              </label>
              <button
                onClick={handleNewTemplate}
                className="p-0.5 hover:bg-gray-200 rounded"
                title="Create new template"
              >
                <Plus className="w-3 h-3 text-gray-500" />
              </button>
            </div>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            {/* Template actions */}
            <div className="flex items-center gap-1 mt-1">
              <button
                onClick={() => {
                  const tpl = templates.find((t) => t.id === selectedTemplateId);
                  if (tpl) handleEditTemplate(tpl);
                }}
                className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-gray-500 hover:bg-gray-200 rounded"
                title="Edit selected template"
              >
                <Pencil className="w-2.5 h-2.5" />
                Edit
              </button>
              {selectedTemplateId !== 'default' && (
                <button
                  onClick={() => handleDeleteTemplate(selectedTemplateId)}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-red-500 hover:bg-red-50 rounded"
                  title="Delete selected template"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                  Delete
                </button>
              )}
            </div>
          </div>

          {/* Template editor */}
          {showTemplateEditor && (
            <div className="border border-gray-200 rounded p-2 space-y-1.5 bg-white">
              <div>
                <label className="block text-[10px] text-gray-500 mb-0.5">Template Name</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name"
                  className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-0.5">Prompt Content</label>
                <textarea
                  value={templateContent}
                  onChange={(e) => setTemplateContent(e.target.value)}
                  rows={4}
                  placeholder="Enter system prompt template..."
                  className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none font-mono"
                />
              </div>
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={handleCancelTemplateEdit}
                  className="px-2 py-0.5 text-[10px] text-gray-500 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTemplate}
                  className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <Save className="w-2.5 h-2.5" />
                  Save
                </button>
              </div>
            </div>
          )}

          {/* System prompt (active) */}
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">
              Active System Prompt
              {selectedTemplateId && (
                <span className="text-gray-400 ml-1">
                  ({templates.find((t) => t.id === selectedTemplateId)?.name})
                </span>
              )}
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={3}
              className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
            />
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-xs text-gray-400 py-8">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>Start a conversation</p>
            <p className="mt-1">Select text in the editor and click ↕ to send it here</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-1.5 text-xs ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800 border border-gray-200'
              }`}
            >
              <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              <div
                className={`text-[10px] mt-0.5 ${
                  msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'
                }`}
              >
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-3 py-1.5 text-xs text-gray-500 border border-gray-200">
              <span className="inline-flex gap-1">
                <span className="animate-bounce">●</span>
                <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>●</span>
                <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>●</span>
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Status message */}
      {statusMessage && (
        <div className="px-3 py-1 bg-blue-50 border-t border-blue-100 text-xs text-blue-700 text-center">
          {statusMessage}
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-gray-200 p-2 space-y-1.5">
        {/* Action button row */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleBidirectionalAction}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 text-gray-600"
            title="Select text in editor (≤200 chars) to paste here, or insert last response at cursor"
          >
            <ArrowLeftRight className="w-3 h-3" />
            ↕ Editor ↔ Chat
          </button>
          {lastResponse && (
            <button
              onClick={handleCopyLastResponse}
              className="p-1 border border-gray-200 rounded hover:bg-gray-50 text-gray-600"
              title="Copy last response"
            >
              <Copy className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Text input */}
        <div className="flex gap-1">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
            rows={2}
            className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="self-end p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Send message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bottom actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={clearHistory}
            disabled={messages.length === 0}
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500 disabled:opacity-30"
            title="Clear conversation history"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
          <span className="text-[10px] text-gray-400">
            {messages.filter((m) => m.role === 'user').length} messages
          </span>
        </div>
      </div>
    </div>
  );
}
