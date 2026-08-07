// SPDX-License-Identifier: MIT
/**
 * S3 Configuration Modal.
 *
 * Allows users to configure connection settings for any S3-compatible
 * object storage service (AWS S3, MinIO, Wasabi, DigitalOcean Spaces,
 * Backflaze B2, Cloudflare R2, etc.).
 */

import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, CheckCircle, Server, Key, Globe, Database, FolderOpen } from 'lucide-react';
import { loadS3Config, saveS3Config, clearS3Config, isS3Configured, S3Config } from '../../utils/s3Config';
import { testConnection } from '../../utils/s3Api';

interface S3ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when configuration is saved successfully. */
  onSaved?: () => void;
}

export default function S3ConfigModal({ isOpen, onClose, onSaved }: S3ConfigModalProps) {
  const [config, setConfig] = useState<S3Config>({
    endpoint: '',
    region: 'us-east-1',
    bucket: '',
    accessKey: '',
    secretKey: '',
    prefix: '',
    forcePathStyle: false,
  });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Load existing config when modal opens
  useEffect(() => {
    if (isOpen) {
      const existing = loadS3Config();
      setConfig(existing);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const updateField = <K extends keyof S3Config>(field: K, value: S3Config[K]) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(false);
  };

  const handleTest = async () => {
    if (!isS3Configured(config)) {
      setError('Please fill in endpoint, bucket, access key, and secret key.');
      return;
    }
    setTesting(true);
    setError(null);
    setSuccess(false);
    try {
      // Save temporarily so testConnection can read it
      saveS3Config(config);
      await testConnection();
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed');
      setSuccess(false);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (!isS3Configured(config)) {
      setError('Please fill in endpoint, bucket, access key, and secret key.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      saveS3Config(config);
      setSuccess(true);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    clearS3Config();
    setConfig({
      endpoint: '',
      region: 'us-east-1',
      bucket: '',
      accessKey: '',
      secretKey: '',
      prefix: '',
      forcePathStyle: false,
    });
    setError(null);
    setSuccess(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Server className="w-5 h-5 text-gray-500" />
            S3-Compatible Storage
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info banner */}
        <div className="mx-4 mt-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          Connect to any S3-compatible service: AWS S3, MinIO, Wasabi, DigitalOcean Spaces, Backblaze B2, Cloudflare R2, or self-hosted object storage.
        </div>

        {/* Error / Success */}
        {error && (
          <div className="mx-4 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1 break-words">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        {success && !error && (
          <div className="mx-4 mt-3 px-3 py-2 bg-green-50 border border-green-200 rounded flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>Connection successful!</span>
          </div>
        )}

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Endpoint */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
              <Globe className="w-3.5 h-3.5" />
              Endpoint URL
            </label>
            <input
              type="url"
              value={config.endpoint}
              onChange={(e) => updateField('endpoint', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 text-sm"
              placeholder="https://s3.amazonaws.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              e.g. https://s3.amazonaws.com, https://nyc3.digitaloceanspaces.com, http://localhost:9000
            </p>
          </div>

          {/* Region */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Region
            </label>
            <input
              type="text"
              value={config.region}
              onChange={(e) => updateField('region', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 text-sm"
              placeholder="us-east-1"
            />
          </div>

          {/* Bucket */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
              <Database className="w-3.5 h-3.5" />
              Bucket Name
            </label>
            <input
              type="text"
              value={config.bucket}
              onChange={(e) => updateField('bucket', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 text-sm"
              placeholder="my-simpledocs-bucket"
            />
          </div>

          {/* Access Key */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
              <Key className="w-3.5 h-3.5" />
              Access Key ID
            </label>
            <input
              type="text"
              value={config.accessKey}
              onChange={(e) => updateField('accessKey', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 text-sm font-mono"
              placeholder="AKIAIOSFODNN7EXAMPLE"
              autoComplete="off"
            />
          </div>

          {/* Secret Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Secret Access Key
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={config.secretKey}
                onChange={(e) => updateField('secretKey', e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 text-sm font-mono"
                placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700"
              >
                {showSecret ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Prefix (optional) */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
              <FolderOpen className="w-3.5 h-3.5" />
              Path Prefix (optional)
            </label>
            <input
              type="text"
              value={config.prefix}
              onChange={(e) => updateField('prefix', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 text-sm"
              placeholder="documents/"
            />
            <p className="text-xs text-gray-500 mt-1">
              Folder prefix for organizing files, e.g. "simpledocs/"
            </p>
          </div>

          {/* Force path-style */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="forcePathStyle"
              checked={config.forcePathStyle}
              onChange={(e) => updateField('forcePathStyle', e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="forcePathStyle" className="text-sm text-gray-700">
              Use path-style addressing
            </label>
          </div>
          <p className="text-xs text-gray-500 -mt-2 ml-6">
            Enable for MinIO, local S3 proxies, or services that don't support virtual-hosted-style URLs.
          </p>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handleClear}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Clear config
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTest}
              disabled={testing}
              className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-sm flex items-center gap-1.5"
            >
              {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Test
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
