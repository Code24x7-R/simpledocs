// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import '@testing-library/jest-dom';

/**
 * jsdom does not implement the layout APIs that ProseMirror's scroll-to-
 * selection and coordinate lookups use (`Text#getClientRects`,
 * `Range#getClientRects`, `Element#scrollIntoView`). Without these shims,
 * editor commands throw asynchronously, which Vitest reports as unhandled
 * errors and turns an otherwise green run into a non-zero exit.
 */
const zeroRect: DOMRect = {
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  width: 0,
  height: 0,
  x: 0,
  y: 0,
  toJSON() {
    return this;
  },
} as DOMRect;

const emptyRectList = {
  length: 0,
  item: () => null,
  [Symbol.iterator]: function* () {},
} as unknown as DOMRectList;

function installLayoutShims(): void {
  if (typeof Element.prototype.scrollIntoView !== 'function') {
    Element.prototype.scrollIntoView = function scrollIntoView() {};
  }

  // Text and Range have no layout methods at all in jsdom.
  for (const proto of [Text.prototype, Range.prototype]) {
    Object.defineProperty(proto, 'getClientRects', {
      configurable: true,
      writable: true,
      value: () => emptyRectList,
    });
    Object.defineProperty(proto, 'getBoundingClientRect', {
      configurable: true,
      writable: true,
      value: () => zeroRect,
    });
  }
}

installLayoutShims();
