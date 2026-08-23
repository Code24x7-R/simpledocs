// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useState, useEffect, useCallback } from 'react';
import { X, Monitor, Sparkles, ExternalLink, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { getAllProviders } from '../../utils/providers/providerRegistry';
import Modal from './Modal';
import { useChatStore } from '../../store/useChatStore';
import type { LlmProvider } from '../../types/provider';

interface ProviderSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SetupStep = 'select' | 'configure' | 'success';

const providerIcons: Record<string, React.ReactNode> = {
  Monitor: <Monitor className="w-8 h-8" />,
  Sparkles: <Sparkles className="w-8 h-8" />,
};

/**
 * Provider Setup Modal
 *
 * Multi-step wizard for adding a new LLM provider.
 * Step 1: Choose provider type (cards)
 * Step 2: Configure (provider-specific form)
 * Step 3: Success confirmation
 */
export default function ProviderSetupModal({ isOpen, onClose }: ProviderSetupModalProps) {
  const [step, setStep] = useState<SetupStep>('select');
  const [selectedProvider, setSelectedProvider] = useState<LlmProvider | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [lmStudioUrl, setLmStudioUrl] = useState('http://localhost:1234');
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testError, setTestError] = useState('');

  const { addProvider, setActiveProvider, updateProviderConfig, checkHealthById } = useChatStore();
  const allProviders = getAllProviders();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedProvider(null);
      setGeminiApiKey('');
      setLmStudioUrl('http://localhost:1234');
      setShowApiKey(false);
      setSelectedModel('');
      setIsTesting(false);
      setTestResult(null);
      setTestError('');
    }
  }, [isOpen]);

  const handleSelectProvider = (provider: LlmProvider) => {
    setSelectedProvider(provider);
    setSelectedModel(provider.getDefaultModel());
    setStep('configure');
  };

  const handleTestConnection = useCallback(async () => {
    if (!selectedProvider) return;

    setIsTesting(true);
    setTestResult(null);
    setTestError('');

    // Create a temporary instance to test
    const tempId = addProvider(selectedProvider.id);

    try {
      let config = selectedProvider.getDefaultConfig();
      if (selectedProvider.id === 'gemini') {
        config = { apiKey: geminiApiKey } as { apiKey: string };
      } else if (selectedProvider.id === 'lmstudio') {
        config = { baseUrl: lmStudioUrl } as { baseUrl: string };
      }

      // Update the temp instance with the actual config
      updateProviderConfig(tempId, config);

      const isHealthy = await checkHealthById(tempId);
      if (isHealthy) {
        setTestResult('success');
      } else {
        setTestResult('error');
        setTestError(`Could not connect to ${selectedProvider.name}. Check your configuration.`);
      }
    } catch {
      setTestResult('error');
      setTestError('Connection test failed.');
    } finally {
      setIsTesting(false);
      // Clean up temp instance
      useChatStore.getState().removeProvider(tempId);
    }
  }, [selectedProvider, geminiApiKey, lmStudioUrl, addProvider, updateProviderConfig, checkHealthById]);

  const handleSaveProvider = () => {
    if (!selectedProvider) return;

    const instanceId = addProvider(selectedProvider.id);

    // Apply config
    if (selectedProvider.id === 'gemini') {
      updateProviderConfig(instanceId, { apiKey: geminiApiKey });
    } else if (selectedProvider.id === 'lmstudio') {
      updateProviderConfig(instanceId, { baseUrl: lmStudioUrl });
    }

    // Set as active
    setActiveProvider(instanceId);

    setStep('success');
  };

  const handleFinish = () => {
    onClose();
  };

  if (!isOpen) return null;

  const canTest = selectedProvider?.id === 'gemini'
    ? geminiApiKey.trim().length >= 10
    : lmStudioUrl.length > 0;

  const canSave = testResult === 'success';

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-[520px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold">
            {step === 'select' && 'Add Provider'}
            {step === 'configure' && `Configure ${selectedProvider?.name}`}
            {step === 'success' && 'Provider Added'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Step 1: Select Provider */}
          {step === 'select' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Choose an LLM provider to add. You can add multiple providers and switch between them.
              </p>
              {allProviders.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleSelectProvider(provider)}
                  className="w-full flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50/30 transition-colors text-left"
                >
                  <div className="text-blue-600 mt-0.5">
                    {providerIcons[provider.icon] || <Monitor className="w-8 h-8" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{provider.name}</span>
                      {provider.hasFreeTier && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                          Free
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{provider.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 'configure' && selectedProvider && (
            <div className="space-y-4">
              {/* Gemini-specific instructions */}
              {selectedProvider.id === 'gemini' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h3 className="text-xs font-semibold text-blue-800 mb-2">How to get a Gemini API key:</h3>
                  <ol className="text-xs text-blue-700 space-y-1.5 list-decimal list-inside">
                    <li>
                      Go to{' '}
                      <a
                        href="https://aistudio.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-blue-900 inline-flex items-center gap-0.5"
                      >
                        aistudio.google.com <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                    <li>Sign in with your Gmail account</li>
                    <li>Click <strong>Get API Key</strong> in the left sidebar</li>
                    <li>Click <strong>Create API Key</strong> &rarr; <strong>Create API Key in new project</strong></li>
                    <li>Copy the key (starts with <code className="bg-blue-100 px-1 rounded">AIza...</code>)</li>
                  </ol>
                  <p className="text-[10px] text-blue-600 mt-2">
                    Free tier: No credit card required. Prompts may be reviewed by Google for training.
                  </p>
                </div>
              )}

              {/* LM Studio-specific instructions */}
              {selectedProvider.id === 'lmstudio' && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <h3 className="text-xs font-semibold text-gray-700 mb-1">LM Studio Setup:</h3>
                  <p className="text-xs text-gray-600">
                    Make sure LM Studio is running with CORS enabled.
                    Go to Settings &rarr; Enable CORS.
                  </p>
                </div>
              )}

              {/* Provider-specific config */}
              {selectedProvider.id === 'gemini' && (
                <>
                  {/* API Key Input */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={geminiApiKey}
                        onChange={(e) => {
                          setGeminiApiKey(e.target.value);
                          setTestResult(null);
                        }}
                        placeholder="AIza..."
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 pr-9 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {geminiApiKey && geminiApiKey.trim().length < 10 && (
                      <p className="text-[10px] text-red-500 mt-1">
                        API key is too short
                      </p>
                    )}
                  </div>

                  {/* Model Selector */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Model
                    </label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {selectedProvider.getAvailableModels().map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} {model.recommended ? '(Recommended)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {selectedProvider.id === 'lmstudio' && (
                <>
                  {/* Base URL Input */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Server URL
                    </label>
                    <input
                      type="text"
                      value={lmStudioUrl}
                      onChange={(e) => {
                        setLmStudioUrl(e.target.value);
                        setTestResult(null);
                      }}
                      placeholder="http://localhost:1234"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </>
              )}

              {/* Test Connection */}
              <div className="space-y-2">
                <button
                  onClick={handleTestConnection}
                  disabled={!canTest || isTesting}
                  className="w-full px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </button>

                {testResult === 'success' && (
                  <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Connection successful!
                  </div>
                )}

                {testResult === 'error' && (
                  <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{testError}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 'success' && (
            <div className="text-center py-6">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="text-sm font-semibold mb-1">Provider Added Successfully</h3>
              <p className="text-xs text-gray-500">
                {selectedProvider?.name} has been added and set as your active provider.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-4 py-3 border-t border-gray-200">
          <div>
            {step === 'configure' && (
              <button
                onClick={() => setStep('select')}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
            >
              {step === 'success' ? 'Close' : 'Cancel'}
            </button>
            {step === 'configure' && (
              <button
                onClick={handleSaveProvider}
                disabled={!canSave}
                className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add Provider
              </button>
            )}
            {step === 'success' && (
              <button
                onClick={handleFinish}
                className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Start Chatting
              </button>
            )}
          </div>
        </div>
    </Modal>
  );
}
