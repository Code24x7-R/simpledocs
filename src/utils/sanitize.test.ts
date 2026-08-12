// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect } from 'vitest';
import {
  sanitizeUrl,
  sanitizeImageSrc,
  sanitizeLineHeight,
  sanitizeFontSize,
  sanitizePixelValue,
  sanitizeColor,
} from './sanitize';
import { sanitizeDocument } from './sanitizeDocument';

describe('sanitizeUrl', () => {
  it('allows http/https URLs', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    expect(sanitizeUrl('http://example.com/path')).toBe('http://example.com/path');
  });

  it('allows mailto and tel', () => {
    expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
    expect(sanitizeUrl('tel:+1234567890')).toBe('tel:+1234567890');
  });

  it('allows relative URLs', () => {
    expect(sanitizeUrl('/path/to/page')).toBe('/path/to/page');
    expect(sanitizeUrl('#anchor')).toBe('#anchor');
    expect(sanitizeUrl('./relative')).toBe('./relative');
    expect(sanitizeUrl('../parent')).toBe('../parent');
  });

  it('blocks javascript: URLs', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeUrl('javascript:void(0)')).toBeNull();
    expect(sanitizeUrl('JaVaScRiPt:alert(1)')).toBeNull();
  });

  it('blocks data: URLs', () => {
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(sanitizeUrl('data:application/javascript,alert(1)')).toBeNull();
  });

  it('blocks vbscript: and file: URLs', () => {
    expect(sanitizeUrl('vbscript:msgbox')).toBeNull();
    expect(sanitizeUrl('file:///etc/passwd')).toBeNull();
  });

  it('handles null/undefined/empty', () => {
    expect(sanitizeUrl(null)).toBeNull();
    expect(sanitizeUrl(undefined)).toBeNull();
    expect(sanitizeUrl('')).toBeNull();
  });
});

describe('sanitizeImageSrc', () => {
  it('allows http(s) image URLs', () => {
    expect(sanitizeImageSrc('https://example.com/img.png')).toBe('https://example.com/img.png');
  });

  it('allows data:image/* URIs', () => {
    expect(sanitizeImageSrc('data:image/png;base64,abc123')).toBe('data:image/png;base64,abc123');
    expect(sanitizeImageSrc('data:image/svg+xml;base64,abc')).toBe('data:image/svg+xml;base64,abc');
  });

  it('blocks data: URIs for non-image types', () => {
    expect(sanitizeImageSrc('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(sanitizeImageSrc('data:application/javascript,alert(1)')).toBeNull();
  });

  it('blocks javascript: URLs', () => {
    expect(sanitizeImageSrc('javascript:alert(1)')).toBeNull();
  });
});

describe('sanitizeLineHeight', () => {
  it('allows unitless numbers', () => {
    expect(sanitizeLineHeight('1')).toBe('1');
    expect(sanitizeLineHeight('1.5')).toBe('1.5');
    expect(sanitizeLineHeight('2')).toBe('2');
    expect(sanitizeLineHeight('3.0')).toBe('3.0');
  });

  it('allows CSS keywords', () => {
    expect(sanitizeLineHeight('normal')).toBe('normal');
    expect(sanitizeLineHeight('inherit')).toBe('inherit');
  });

  it('allows values with units', () => {
    expect(sanitizeLineHeight('24px')).toBe('24px');
    expect(sanitizeLineHeight('1.5em')).toBe('1.5em');
    expect(sanitizeLineHeight('150%')).toBe('150%');
  });

  it('blocks out-of-range values', () => {
    expect(sanitizeLineHeight('0.1')).toBeNull();
    expect(sanitizeLineHeight('20')).toBeNull();
  });

  it('blocks CSS injection attempts', () => {
    expect(sanitizeLineHeight('2; color: red')).toBeNull();
    expect(sanitizeLineHeight('2; background: url(evil)')).toBeNull();
    expect(sanitizeLineHeight('expression(alert(1))')).toBeNull();
  });

  it('handles null/undefined', () => {
    expect(sanitizeLineHeight(null)).toBeNull();
    expect(sanitizeLineHeight(undefined)).toBeNull();
  });
});

describe('sanitizeFontSize', () => {
  it('allows valid px/em/rem/% values', () => {
    expect(sanitizeFontSize('12px')).toBe('12px');
    expect(sanitizeFontSize('16px')).toBe('16px');
    expect(sanitizeFontSize('1.5em')).toBe('1.5em');
    expect(sanitizeFontSize('100%')).toBe('100%');
  });

  it('blocks unitless values', () => {
    expect(sanitizeFontSize('12')).toBeNull();
    expect(sanitizeFontSize('16')).toBeNull();
  });

  it('blocks out-of-range values', () => {
    expect(sanitizeFontSize('0px')).toBeNull();
    expect(sanitizeFontSize('500px')).toBeNull();
  });

  it('blocks CSS injection', () => {
    expect(sanitizeFontSize('16px; color: red')).toBeNull();
    expect(sanitizeFontSize('16px; background: url(evil)')).toBeNull();
  });
});

describe('sanitizePixelValue', () => {
  it('returns valid integers', () => {
    expect(sanitizePixelValue(0)).toBe(0);
    expect(sanitizePixelValue(40)).toBe(40);
    expect(sanitizePixelValue(100)).toBe(100);
  });

  it('parses string numbers', () => {
    expect(sanitizePixelValue('40')).toBe(40);
    expect(sanitizePixelValue('100px')).toBe(100);
  });

  it('clamps to 0-1000 range', () => {
    expect(sanitizePixelValue(-10)).toBe(0);
    expect(sanitizePixelValue(2000)).toBe(1000);
  });

  it('handles invalid values', () => {
    expect(sanitizePixelValue('abc')).toBe(0);
    expect(sanitizePixelValue(NaN)).toBe(0);
    expect(sanitizePixelValue(Infinity)).toBe(0);
    expect(sanitizePixelValue(null)).toBe(0);
    expect(sanitizePixelValue(undefined)).toBe(0);
  });
});

describe('sanitizeColor', () => {
  it('allows hex colors', () => {
    expect(sanitizeColor('#fff')).toBe('#fff');
    expect(sanitizeColor('#ff0000')).toBe('#ff0000');
    expect(sanitizeColor('#FF0000')).toBe('#FF0000');
  });

  it('allows rgb/rgba/hsl/hsla', () => {
    expect(sanitizeColor('rgb(255, 0, 0)')).toBe('rgb(255, 0, 0)');
    expect(sanitizeColor('rgba(255, 0, 0, 0.5)')).toBe('rgba(255, 0, 0, 0.5)');
    expect(sanitizeColor('hsl(0, 100%, 50%)')).toBe('hsl(0, 100%, 50%)');
  });

  it('allows named colors', () => {
    expect(sanitizeColor('red')).toBe('red');
    expect(sanitizeColor('blue')).toBe('blue');
    expect(sanitizeColor('transparent')).toBe('transparent');
  });

  it('blocks CSS injection', () => {
    expect(sanitizeColor('red; background: url(evil)')).toBeNull();
    expect(sanitizeColor('expression(alert(1))')).toBeNull();
    expect(sanitizeColor('url(javascript:alert(1))')).toBeNull();
  });
});

describe('sanitizeDocument', () => {
  it('sanitizes link hrefs', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              marks: [
                { type: 'link', attrs: { href: 'javascript:alert(1)' } },
              ],
              text: 'click me',
            },
          ],
        },
      ],
    };
    sanitizeDocument(doc);
    expect(doc.content[0].content[0].marks[0].attrs.href).toBeNull();
  });

  it('preserves safe link hrefs', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              marks: [
                { type: 'link', attrs: { href: 'https://example.com' } },
              ],
              text: 'safe link',
            },
          ],
        },
      ],
    };
    sanitizeDocument(doc);
    expect(doc.content[0].content[0].marks[0].attrs.href).toBe('https://example.com');
  });

  it('sanitizes image src', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'image',
          attrs: { src: 'javascript:alert(1)' },
        },
      ],
    };
    sanitizeDocument(doc);
    expect(doc.content[0].attrs.src).toBeNull();
  });

  it('preserves data:image src', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'image',
          attrs: { src: 'data:image/png;base64,abc123' },
        },
      ],
    };
    sanitizeDocument(doc);
    expect(doc.content[0].attrs.src).toBe('data:image/png;base64,abc123');
  });

  it('sanitizes paragraph lineHeight', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { lineHeight: '2; color: expression(alert(1))' },
        },
      ],
    };
    sanitizeDocument(doc);
    expect(doc.content[0].attrs.lineHeight).toBeNull();
  });

  it('preserves valid lineHeight', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { lineHeight: '1.5' },
        },
      ],
    };
    sanitizeDocument(doc);
    expect(doc.content[0].attrs.lineHeight).toBe('1.5');
  });

  it('clamps indent values', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { indent: 5000 },
        },
      ],
    };
    sanitizeDocument(doc);
    expect(doc.content[0].attrs.indent).toBe(1000);
  });

  it('sanitizes textStyle color', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              marks: [
                {
                  type: 'textStyle',
                  attrs: { color: 'red; background: url(evil)' },
                },
              ],
              text: 'styled',
            },
          ],
        },
      ],
    };
    sanitizeDocument(doc);
    expect(doc.content[0].content[0].marks[0].attrs.color).toBeNull();
  });

  it('sanitizes deeply nested content', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  marks: [
                    { type: 'link', attrs: { href: 'javascript:alert(1)' } },
                  ],
                  text: 'nested malicious link',
                },
              ],
            },
          ],
        },
      ],
    };
    sanitizeDocument(doc);
    expect(doc.content[0].content[0].content[0].marks[0].attrs.href).toBeNull();
  });
});
