/**
 * Clipboard utilities for rich text copy/cut/paste operations.
 * Uses the browser Clipboard API with both text/plain and text/html formats.
 */

export async function copyToClipboard(text: string, html?: string): Promise<boolean> {
  if (navigator.clipboard && window.ClipboardItem) {
    try {
      const items: Record<string, Blob> = {
        'text/plain': new Blob([text], { type: 'text/plain' }),
      };
      if (html) {
        items['text/html'] = new Blob([html], { type: 'text/html' });
      }
      await navigator.clipboard.write([new ClipboardItem(items)]);
      return true;
    } catch {
      // Fallback for browsers that don't support ClipboardItem
      return fallbackCopy(text);
    }
  }
  return fallbackCopy(text);
}

export async function cutToClipboard(text: string, html?: string): Promise<boolean> {
  const success = await copyToClipboard(text, html);
  return success;
}

export async function pasteFromClipboard(): Promise<{ text: string; html: string }> {
  if (navigator.clipboard && window.ClipboardItem) {
    try {
      const items = await navigator.clipboard.read();
      let text = '';
      let html = '';
      for (const item of items) {
        if (item.types.includes('text/html')) {
          const blob = await item.getType('text/html');
          html = await blob.text();
        }
        if (item.types.includes('text/plain')) {
          const blob = await item.getType('text/plain');
          text = await blob.text();
        }
      }
      return { text, html };
    } catch {
      // Fallback
      return fallbackPaste();
    }
  }
  return fallbackPaste();
}

function fallbackCopy(text: string): boolean {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  textArea.style.top = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  let success = false;
  try {
    success = document.execCommand('copy');
  } catch {
    // ignore
  }
  document.body.removeChild(textArea);
  return success;
}

async function fallbackPaste(): Promise<{ text: string; html: string }> {
  // Fallback: use a temporary editable div to paste into
  const el = document.createElement('div');
  el.contentEditable = 'true';
  el.style.position = 'fixed';
  el.style.left = '-9999px';
  el.style.top = '0';
  document.body.appendChild(el);
  el.focus();
  document.execCommand('paste');
  const text = el.textContent || '';
  const html = el.innerHTML || '';
  document.body.removeChild(el);
  return { text, html };
}
