# Single-Editor Architecture — Technical Reference

## Overview

SimpleDocs uses a **single Tiptap editor instance** for the entire document. Pages are visual guides computed from content height, not separate content containers. This is the "Google Docs method" — one continuous document with CSS-driven page visualization.

---

## Core Principles

1. **One editor instance** — `useEditor()` is called once in `DocumentEditor.tsx`
2. **Single content tree** — `DocState.content: Record<string, unknown>` holds the full Tiptap JSON
3. **Pages are visual** — Page backgrounds rendered at fixed intervals; page count = `ceil(contentHeight / pageHeight)`
4. **No content redistribution** — Content flows naturally; CSS `break-after: page` handles print/PDF breaks
5. **Migration on load** — Old `pages[]` format auto-migrates via `migrateToContent()`

---

## Data Flow

```
User types → Tiptap transaction → editor.on('update') → Zustand store → localStorage (debounced)
                                                                        → PaginationContext (recomputes page count)
                                                                        → PaginatedViewport (re-renders page backgrounds)
```

---

## Component Responsibilities

### `DocumentEditor.tsx`
- Creates the single Tiptap `useEditor()` instance
- Configures all extensions (StarterKit, Table, FontSize, Color, Highlight, PageBreak, TemplateField)
- Exposes editor to store via `setEditor()`
- Handles `Ctrl+Enter` for page break insertion

### `PaginatedViewport.tsx`
- Renders the editor inside a scrollable container
- Computes page count from `contentHeight / pageHeight`
- Renders visual page backgrounds at fixed `pageHeightPx + pageGapPx` intervals
- Handles scroll-to-page for navigation

### `PaginationContext.tsx`
- Computes page geometry from `docState.settings` (page format, orientation, margins, header/footer heights)
- Provides `pageHeightPx`, `pageWidthPx`, `marginTopPx`, etc. to child components
- No longer needs a layout engine — geometry is straightforward math

### `PageNavigation.tsx`
- Tracks cursor position within the single editor
- Computes current page from cursor Y position relative to page height
- Handles prev/next page navigation via scroll

### `SearchReplaceModal.tsx`
- Operates on the single content tree
- Uses `editor.commands.findAll()` or similar for search
- No cross-page logic needed

### `FieldMergeModal.tsx`
- Calls `mergeFields(docState.content, docState, pageIndex, customValues)`
- Updates content via `updateContent()` — no per-page updates needed

---

## Migration from Multi-Page Format

The `migrateToContent()` function in `useDocStore.ts` handles old documents:

```typescript
function migrateToContent(parsed: Record<string, unknown>): DocState {
  // Already in new format
  if (parsed.content && !parsed.pages) {
    return parsed as unknown as DocState;
  }

  // Old format: merge all page.content trees into single doc
  if (parsed.pages && Array.isArray(parsed.pages)) {
    const mergedContent = {
      type: 'doc',
      content: parsed.pages.flatMap(page => page.content?.content || []),
    };
    const { pages: _, ...rest } = parsed;
    return { ...rest, content: mergedContent } as unknown as DocState;
  }

  // Fallback: empty document
  return createNewDoc();
}
```

---

## What Was Removed

| Removed File | Reason |
|--------------|--------|
| `PageEditor.tsx` | No per-page editors needed |
| `MultiPageEditor.tsx` | No multi-editor coordination needed |
| `pageOverflow.ts` | No overflow detection needed |
| `DocumentLayoutEngine.ts` | No AST-based pagination needed |
| `types/page.ts` | No `Page` type needed |

---

## Testing Implications

- **Single editor** — Tests use `editor` from store directly, no DOM queries for page editors
- **No cross-page navigation** — Keyboard tests simplified to single-editor cursor movement
- **Content assertions** — Check `docState.content` directly, no page indexing
- **Migration tests** — Verify old format loads and merges correctly

---

## Benefits of Single-Editor Architecture

1. **Simpler mental model** — One content tree, one editor
2. **No sync bugs** — Eliminated 19+ bugfixes from multi-editor sync issues
3. **Better performance** — One editor instance, no per-page re-renders
4. **Native Tiptap behavior** — Cursor, selection, undo/redo work as designed
5. **Cleaner print/PDF** — CSS page breaks work with browser's native rendering
