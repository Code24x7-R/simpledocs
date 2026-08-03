# Single-Editor Constraints — Audit & Fixes

## Summary

The old architecture had a single `DocumentEditor` with one Tiptap instance. The store's `editor` referenced this single instance. With the new multi-page architecture, each page has its own editor instance. This audit identifies all places that assumed a single editor and documents the fix status.

---

## Constraint Inventory

### 1. Search & Replace (`SearchReplaceModal.tsx`)
**Status:** ✅ FIXED

**Problem:** Used `editor` from store (single instance). Only searched/replaced on the currently focused page.

**Fix:**
- `handleFind()` — Builds combined text from all pages via `buildCombinedText()`, finds matches across all pages, navigates to the correct page on match
- `handleFindNext()` / `handleFindPrev()` — Uses `findPageForIndex()` to determine which page contains the match, focuses that page's editor
- `handleReplace()` — Iterates over `docState.pages`, applies `replaceAllPreservingStyles()` to each page's JSON, updates all pages via `loadDocument()`
- `scrollMatchIntoView()` — Updated to accept a page editor parameter

**New helpers:**
- `getEditorForPage(pageIndex)` — Queries DOM for page editor instance
- `buildCombinedText()` — Returns `{ pageIndex, offset, text }[]` for all pages
- `findPageForIndex(globalIndex, pages)` — Maps global text index to `{ pageIndex, localIndex }`

---

### 2. Toolbar (`Toolbar/Toolbar.tsx`)
**Status:** ✅ NO CHANGE NEEDED

**Analysis:** Uses `editor` from store for `isActive()` checks and formatting actions. The store's `editor` is updated via `setEditor()` when a page's `onFocus` fires. The Toolbar re-renders when `editor` changes (Zustand subscription).

**Behavior:** Toolbar operates on the currently focused page. This is correct — formatting should apply to the page the user is editing.

---

### 3. Navbar — Copy/Cut/Paste/Undo/Redo (`Navbar.tsx`)
**Status:** ✅ NO CHANGE NEEDED

**Analysis:** Uses `editor` from store. Same as Toolbar — operates on the currently focused page.

**Additional fix:** Added null-safety with `editor?.can()?.undo()` and `editor?.can()?.redo()` to prevent crashes when `editor` is null (e.g., after loading a new document before clicking into a page).

---

### 4. Insert Field Modal (`InsertFieldModal.tsx`)
**Status:** ✅ NO CHANGE NEEDED

**Analysis:** Uses `editor` from store. Inserts template field into the currently focused page. Correct behavior.

---

### 5. Page Navigation — Cursor Position (`PageNavigation.tsx`)
**Status:** ✅ NO CHANGE NEEDED

**Analysis:** Subscribes to `editor.on('selectionUpdate')` from the store's editor. Tracks cursor position for the currently focused page. Correct behavior.

---

### 6. PgUp/PgDn (`PaginatedViewport.tsx`)
**Status:** ✅ FIXED (previously)

**Analysis:** Added keydown listener in capture phase that intercepts PgUp/PgDn. Uses `getEditorForPage()` to find page editors via DOM queries, not the store's single `editor`.

---

### 7. Cross-Page Navigation (`MultiPageEditor.tsx`)
**Status:** ✅ FIXED (previously)

**Analysis:** All navigation handlers (`handleFocusNextPage`, `handleFocusPrevPage`, `handleMergeWithPrevPage`, overflow handler) use DOM queries to find page editors, not the store's `editor`.

---

## Architecture Pattern

The store's `editor` is now a "currently focused page" reference, updated via `setEditor()` in each PageEditor's `onFocus` callback. Components that need to operate on all pages use DOM queries (`document.querySelector('[data-page-editor="N"] .tiptap')`) to find specific page editors.

**Key principle:** Single-page operations (formatting, insert, undo/redo) use the store's `editor`. Multi-page operations (search/replace, PgUp/PgDn) query the DOM for specific page editors.

---

## Test Coverage

- `tests/e2e/keyboard-navigation.spec.ts` — Cross-page keyboard navigation
- `tests/e2e/merge-focus.spec.ts` — Focus behavior after merge
- `tests/e2e/SearchReplaceModal.test.ts` — TODO: Cross-page search/replace
