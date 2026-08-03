# WYSIWYG Pagination — CSS-Driven Page Visualization

## Overview

SimpleDocs uses a **CSS-driven pagination** approach (the "Google Docs method"):

- **One continuous document** — Content flows naturally without forced page breaks
- **Visual page guides** — Page backgrounds rendered at fixed intervals in the scroll container
- **CSS page breaks** — `break-after: page` handles print/PDF pagination
- **Dynamic page count** — Computed from `contentHeight / pageHeight`

---

## Page Geometry

### Settings-Derived Values

```
pageWidth = formatWidth(pageFormat, orientation)   // e.g., 210mm for A4 portrait
pageHeight = formatHeight(pageFormat, orientation)  // e.g., 297mm for A4 portrait

Convert to pixels (96 DPI):
  pageWidthPx = mmToPx(pageWidth)
  pageHeightPx = mmToPx(pageHeight)

Usable area:
  marginTopPx = convertMargin(margins.top)
  marginBottomPx = convertMargin(margins.bottom)
  headerHeightPx = header.enabled ? convertMm(10) : 0
  footerHeightPx = footer.enabled ? convertMm(10) : 0
  usableHeightPx = pageHeightPx - marginTopPx - marginBottomPx - headerHeightPx - footerHeightPx
```

### Page Count

```
pageCount = ceil(contentScrollHeight / (pageHeightPx + pageGapPx))
```

Where `pageGapPx` is the visual gap between page canvases (default 24px).

---

## Page Background Rendering

The `PaginatedViewport.tsx` renders visual page backgrounds at fixed intervals:

```tsx
// Pseudocode
const pageCount = Math.ceil(contentHeight / (pageHeightPx + pageGapPx));

for (let i = 0; i < pageCount; i++) {
  const top = i * (pageHeightPx + pageGapPx);
  renderPageBackground(top, pageWidthPx, pageHeightPx, margins);
}
```

Each page background is a positioned `div` with:
- Fixed `width` and `height` matching page dimensions
- White background with subtle shadow
- Margin offsets for header/footer areas

---

## Page Breaks

### Manual Page Breaks

Users insert manual page breaks via `Ctrl+Enter` or the Insert menu. The PageBreak extension creates an inline node with CSS:

```css
.page-break {
  break-after: page;
  display: block;
  height: 0;
  overflow: hidden;
}
```

### Print/PDF Behavior

For print and PDF export, CSS page breaks ensure content flows correctly across physical pages:

```css
@media print {
  .page-break {
    break-after: page;
  }
  
  .page-background {
    box-shadow: none;
    margin: 0;
  }
}
```

---

## Headers & Footers

Headers and footers are rendered within the page background's margin area:

- **Header:** Top margin area, 10mm height, centered text
- **Footer:** Bottom margin area, 10mm height, centered text with page numbers

Dynamic placeholders:
- `{page}` — Current page number (1-based)
- `{total}` — Total page count

### Template Fields in Headers/Footers

Headers and footers support template fields (e.g., `{{document_title}}`) which are resolved at render time using the current `DocState`.

---

## Page Navigation

### Cursor-to-Page Mapping

```typescript
const cursorPage = Math.floor(cursorY / (pageHeightPx + pageGapPx));
```

Where `cursorY` is the cursor's vertical position within the scroll container.

### Scroll-to-Page

```typescript
const targetScroll = pageIndex * (pageHeightPx + pageGapPx);
container.scrollTo({ top: targetScroll, behavior: 'smooth' });
```

---

## Comparison with Old Architecture

| Aspect | Old (Multi-Editor) | New (Single-Editor + CSS) |
|--------|-------------------|---------------------------|
| Editor instances | N (one per page) | 1 |
| Content model | `pages[]` array | Single `content` tree |
| Page breaks | Content splitting | CSS `break-after` |
| Page count | Array length | Computed from height |
| Overflow detection | Manual scrollHeight checks | None needed |
| Cursor management | Cross-page sync | Native Tiptap |
| Search/replace | Per-page iteration | Single content tree |
| Undo/redo | Per-page stacks | Single stack |
| Complexity | High (19+ bugfixes) | Low |

---

## Future Enhancements

- **Widow/orphan control** — CSS `widows` and `orphans` properties (limited browser support)
- **Column layouts** — CSS `column-count` for multi-column pages
- **Section breaks** — Different page formats/orientations within one document
- **Table of contents** — Auto-generated from heading nodes in content tree
