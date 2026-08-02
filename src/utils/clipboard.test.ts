// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { copyToClipboard, pasteFromClipboard } from './clipboard';

describe('clipboard', () => {
  beforeEach(() => {
    // jsdom doesn't implement execCommand, add a mock
    document.execCommand = vi.fn().mockReturnValue(true);

    // Reset clipboard mock
    Object.assign(navigator, {
      clipboard: {
        write: vi.fn().mockResolvedValue(undefined),
        read: vi.fn().mockResolvedValue([]),
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue(''),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (document as any).execCommand;
  });

  describe('copyToClipboard', () => {
    it('writes text and html to clipboard when ClipboardItem is available', async () => {
      // Mock ClipboardItem as available
      (global as any).ClipboardItem = class {
        constructor(items: Record<string, Blob>) {
          Object.assign(this, { items });
        }
      };

      const result = await copyToClipboard('Hello World', '<p>Hello World</p>');
      expect(result).toBe(true);
      expect(navigator.clipboard.write).toHaveBeenCalled();
    });

    it('falls back to execCommand when ClipboardItem is not available', async () => {
      delete (global as any).ClipboardItem;

      const execCommandSpy = vi.spyOn(document, 'execCommand').mockReturnValue(true);
      const result = await copyToClipboard('Fallback text');

      expect(result).toBe(true);
      expect(execCommandSpy).toHaveBeenCalledWith('copy');

      execCommandSpy.mockRestore();
    });

    it('returns false when clipboard write fails and fallback also fails', async () => {
      (global as any).ClipboardItem = class {
        constructor() {
          throw new Error('Not supported');
        }
      };

      const execCommandSpy = vi.spyOn(document, 'execCommand').mockReturnValue(false);
      const result = await copyToClipboard('Test');

      expect(result).toBe(false);
      execCommandSpy.mockRestore();
    });
  });

  describe('pasteFromClipboard', () => {
    it('reads text and html from clipboard items', async () => {
      // Ensure ClipboardItem is defined so the primary path is used
      (global as any).ClipboardItem = class {
        constructor() {}
      };

      const mockItems = [
        {
          types: ['text/plain', 'text/html'],
          getType: vi.fn((type: string) => {
            const content = type === 'text/html' ? '<p>Pasted</p>' : 'Pasted';
            // Return a mock blob with a text() method
            return Promise.resolve({
              text: () => Promise.resolve(content),
            });
          }),
        },
      ];

      (navigator.clipboard as any).read = vi.fn().mockResolvedValue(mockItems);

      const result = await pasteFromClipboard();
      expect(result.text).toBe('Pasted');
      expect(result.html).toBe('<p>Pasted</p>');
    });

    it('calls fallback when clipboard read fails', async () => {
      // Remove ClipboardItem so fallback path is used
      delete (global as any).ClipboardItem;
      (navigator.clipboard as any).read = vi.fn().mockRejectedValue(new Error('Denied'));

      const result = await pasteFromClipboard();
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('html');
    });
  });
});
