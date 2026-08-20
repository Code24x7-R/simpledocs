# Tiptap Integration Audit — SimpleDocs

**Date:** 2026-08-20
**Status:** Analysis complete — fixes implemented below

---

## 1. Architecture Overview

The app uses a **single Tiptap editor** instance rendered inside a paginated viewport. Content flows naturally; pages are visual guides for print/PDF.

```
App.tsx
├── Navbar (menus: File, Edit, Insert, View, Help)
├── Toolbar (formatting controls)
├── PageNavigation (prev/next/page indicator/stats)
└── PaginatedViewport (scroll container + zoom)
    └── DocumentEditor (single Tiptap instance)
        ├── EditorBubbleMenu (floating toolbar on selection)
        └── EditorContent (ProseMirror rendered content)

Modals (all controlled via useDocStore):
├── LinkModal, ImageModal, TableGridModal
├── TableOfContentsModal, InsertFieldModal, FieldMergeModal
├── SearchReplaceModal, CloudStorageModal, AboutModal
└── KeyboardShortcutsModal, PageSetupModal, ChatPanel
```

**State:** Zustand store (`useDocStore`) holds `docState`, `editor` ref, and all modal open/close flags.

---

## 2. Findings — Overlaps, Duplications, Inconsistencies

### 2.1 DUPLICATE: Clipboard Operations (Copy/Cut/Paste)

**Problem:** Three independent implementations of copy/cut/paste exist:

| Location | Functions | Uses |
|---|---|---|
| `Toolbar.tsx` | `handleCopy`, `handleCut`, `handlePaste` | `copyToClipboard` + `editor.view.nodeDOM` |
| `Navbar.tsx` | `handleCopy`, `handleCut`, `handlePaste` | `copyToClipboard` + `editor.view.nodeDOM` |
| Browser native | Ctrl+C/X/V | Tiptap's built-in clipboard handling |

The Toolbar and Navbar implementations are **byte-for-byte identical** in logic. This means two separate code paths maintain the same behavior, and any bug fix must be applied twice.

**Fix:** Consolidate into a single `useEditorClipboard` hook. Toolbar and Navbar both call the hook.

### 2.2 DUPLICATE: Link Click Handling

**Problem:** Three code paths handle link clicks:

1. `DocumentEditor` → `editorProps.handleClick` (ProseMirror-level)
2. `DocumentEditor` → native `click` event listener on `editorRef` (DOM-level, added as fix)
3. `useLinkPreview` → `onMouseOver` on the editor div (hover preview)

The native click listener (#2) was added as a fallback for links inside custom nodes like `tableOfContents`. But it duplicates #1 entirely — both call `scrollToElement` with the same query.

**Fix:** Remove the native click listener. Instead, fix `editorProps.handleClick` to be the single handler (it works because Tiptap's handleClick fires for ALL clicks in the editor, regardless of node type). If custom nodes block propagation, fix those nodes.

### 2.3 INCONSISTENT: Link Modal Opening

**Problem:** Link modal opens via two different mechanisms:

- `Navbar.tsx` Insert menu dispatches `window.dispatchEvent(new CustomEvent('simpledocs:open-link'))`
- `DocumentEditor` Ctrl+K handler dispatches the same custom event
- `App.tsx` listens for this event

But `BubbleMenu.tsx` uses `window.prompt()` directly for link editing — bypassing the modal entirely. This creates three UX paths for links:
- Ctrl+K → modal (good)
- Insert menu → modal (good)
- Bubble menu → browser prompt (bad — inconsistent, ugly)

**Fix:** Bubble menu should also dispatch the custom event to open the modal.

### 2.4 NAVIGATION BUG: Page Navigation Doesn't Move Cursor

**Problem:** `goToPage`/`goToNextPage`/`goToPrevPage` in `PageNavigation.tsx` update `currentPage` in the store. `PaginatedViewport` sees this change and scrolls the viewport. But the **editor cursor stays where it was**.

Result: User clicks "Next Page" → viewport scrolls, but caret remains on the old page. When the user starts typing, the editor scrolls back to the caret position, fighting the user.

**Fix:** When navigating pages, also move the editor caret to the first visible position on the target page.

### 2.5 NAVIGATION BUG: Search/Replace Scroll Conflicts

**Problem:** `SearchReplaceModal.scrollMatchIntoView` directly calls `scrollContainer.scrollTo()`. This triggers `PaginatedViewport.handleScroll`, which updates `currentPage`. So after each "Find Next", the page indicator jumps — even if the match is on the same page.

The `isNavigatingRef` in PaginatedViewport is only set during programmatic page navigation, not during search scrolling. So search scrolling "fights" the page tracker.

**Fix:** Use a shared `programmaticScrollRef` that both page nav and search scrolling set before scrolling. `handleScroll` should skip page updates when this ref is set.

### 2.6 OVER-COUPLED: useDocStore Holds Everything

**Problem:** The store mixes:
- Document state (`docState`, `content`)
- Editor instance (`editor`)
- UI state (14 modal open/boolean flags)
- View state (`zoom`, `fullBleedMode`, `currentPage`, `totalPages`)
- Selection state (`savedLinkSelection`)

This creates hidden dependencies. For example, `currentPage` updates trigger scroll effects that read `docState.content` which may be mid-update.

**Fix (minimal):** Extract modal UI state into a separate `useUIStore` to reduce re-render scope. At minimum, move `currentPage`/`totalPages` into a `useNavigationStore` since they're view-only state that shouldn't trigger document re-renders.

### 2.7 INCONSISTENT: Selection Restoration After Modals

**Problem:** Some modals save/restore editor selection, others don't:

| Modal | Saves selection? | Restores? |
|---|---|---|
| LinkModal | Yes (`savedLinkSelection`) | Yes |
| TableOfContentsModal | No | No |
| ImageModal | No | No |
| TableGridModal | No | No |
| InsertFieldModal | No | No |

TOC insertion calls `editor.chain().focus()` which moves the cursor to the current position, but after `setContent` the cursor resets to position 0.

**Fix:** For insert operations, capture the cursor position before and restore it after.

### 2.8 INCONSISTENT: Zoom Levels Limited

**Problem:** Navbar offers only 75%, 100%, 125%. No zoom-to-fit, no zoom out beyond 75%, no zoom in beyond 125%. Toolbar has no zoom control at all (common in word processors).

**Fix:** Add zoom in/out buttons with sensible range (50%–200%).

### 2.9 DUPLICATE: Text Color Palettes

**Problem:** `Toolbar.tsx` and `BubbleMenu.tsx` both define identical `TEXT_COLORS` and `HIGHLIGHT_COLORS` arrays. Any color palette change must be made in two places.

**Fix:** Extract to a shared `constants.ts`.

### 2.10 RACE CONDITION: Content Sync useEffect

**Problem:** DocumentEditor's `useEffect([docState.content])` compares `JSON.stringify(currentContent) !== JSON.stringify(docState.content)` and calls `setContent` on mismatch. This fires after EVERY `updateContent` call (including from `onUpdate` itself, though the JSON should match then). But if any code calls `updateContent` without going through the editor, the editor is force-synced.

This is actually working correctly now with the TOC fix, but it's fragile. The `queueMicrotask` defers the setContent, which means there's a frame where the editor and store disagree.

---

## 3. Priority Fixes

### P0 — Navigation Breaks (user-reported)
1. **Page navigation should move cursor** — fix `goToPage` to also set caret position
2. **Search scroll shouldn't fight page tracker** — shared `programmaticScrollRef`

### P1 — Duplication Cleanup
3. **Consolidate clipboard** — single `useEditorClipboard` hook
4. **Remove duplicate link click handler** — keep only `editorProps.handleClick`
5. **Extract color palettes** — shared constants

### P2 — UX Consistency
6. **Bubble menu link → modal** instead of `window.prompt`
7. **Selection restoration** for insert modals
8. **Expand zoom range** with +/- buttons

### P3 — Architecture
9. **Split useDocStore** — separate UI state from document state

---

## 4. Files Modified

| File | Changes |
|---|---|
| `src/components/editor/PaginatedViewport.tsx` | Add `programmaticScrollRef`, expose via context |
| `src/components/editor/PageNavigation.tsx` | Move cursor on page nav |
| `src/components/layout/SearchReplaceModal.tsx` | Use shared `programmaticScrollRef` |
| `src/components/layout/Toolbar.tsx` | Use shared clipboard hook, remove duplicate colors |
| `src/components/layout/Navbar.tsx` | Use shared clipboard hook |
| `src/components/editor/BubbleMenu.tsx` | Open link modal instead of prompt |
| `src/components/editor/DocumentEditor.tsx` | Remove duplicate click handler |
| `src/hooks/useEditorClipboard.ts` | **NEW** — consolidated clipboard logic |
| `src/constants.ts` | **NEW** — shared color palettes |
