# simpledocs — Project Roadmap

## Phase Overview

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Setup & Dependencies | COMPLETE ✅ |
| 2 | Core Editor (Tiptap, store, UI shell) | COMPLETE ✅ |
| 3 | Pagination & Page Rendering | COMPLETE ✅ |
| 4 | Tables Support | COMPLETE ✅ |
| 5 | Template/Variable Fields | COMPLETE ✅ |
| 6 | File Operations (JSON + PDF) | COMPLETE ✅ |
| 7 | Testing Suite | COMPLETE ✅ |
| 8 | Deployment (GitHub Pages) | COMPLETE ✅ |
| 9 | Documentation (README) | COMPLETE ✅ |
| 10 | Help Menu & About Modal | COMPLETE ✅ |
| 11 | Clipboard Functions | COMPLETE ✅ |
| 12 | Microsoft Word Import + MRU | COMPLETE ✅ |
| 13 | Auto Page Break on Overflow | COMPLETE ✅ |
| 14 | Search and Replace | COMPLETE ✅ |
| 15 | True Content Splitting Across Pages | COMPLETE ✅ |
| 16 | Color Picker Fix | IN PROGRESS 🔄 |
| 17 | True Paginated Content Model | COMPLETE ✅ |
| 18 | Keyboard Navigation & Focus Management | COMPLETE ✅ |
| 19 | Template Field Display, Merge & Common Use Cases | COMPLETE ✅ |
| 20 | Font Size Extension (canonical spec) | COMPLETE ✅ |
| 21 | Code Deduplication & Dead Code Cleanup | COMPLETE ✅ |
| 22 | Chatbot Integration (LM Studio) | COMPLETE ✅ |
| 23 | Markdown Export | COMPLETE ✅ |
| 24 | Search & Replace Enhancements | IN PROGRESS 🔄 |

---

## Detailed Phase Breakdown

### Phase 1: Setup & Dependencies ✅
- Scaffold Vite + React + TypeScript project
- Install Tiptap, Zustand, Tailwind, @tanstack/react-virtual, html2pdf.js
- Configure Tailwind, PostCSS, Vite, TypeScript strict mode
- Set up GitHub Actions deploy workflow
- Add Vite define for build info (commit hash, timestamp, version)

### Phase 2: Core Editor ✅
- Implement `useDocStore` (Zustand) with DocState schema
- Build Navbar (File menu, Undo/Redo, Zoom, Help menu)
- Build Toolbar (all formatting controls, dropdowns, color pickers)
- Build DocumentEditor with Tiptap instance
- Implement all extensions: StarterKit, Table, Underline, TextStyle, FontFamily, Color, Highlight, TextAlign, TaskList

### Phase 3: Pagination & Page Rendering ✅
- Build PageCanvas with A4/Letter dimensions (mm to px conversion)
- Implement configurable margins, header, footer with page numbers
- Build PaginatedViewport with @tanstack/react-virtual
- Implement PageBreak extension (Ctrl+Enter)
- Add zoom controls (75%, 100%, 125%)

### Phase 4: Tables Support ✅
- Integrate Tiptap table extensions
- Build TableGridModal (10×10 grid picker)
- Support resizable columns

### Phase 5: Template/Variable Fields ✅
- Implement TemplateField custom node extension
- Build TemplateFieldView React NodeView
- Build InsertFieldModal (standard + custom fields)
- Non-editable inline badges with hover highlight

### Phase 6: File Operations ✅
- JSON export (download .json file)
- JSON import (file upload, schema validation)
- PDF export via html2pdf.js (margin matching, page breaking)
- Print support (window.print())
- localStorage auto-save with 500ms debounce

### Phase 7: Testing Suite ✅
- Unit tests: useDocStore (12 tests), unitConversion (9 tests), fileIO (5 tests), TemplateField (7 tests), PageBreak (4 tests)
- Total: 37 tests across 5 suites
- E2E tests: editor.spec.ts, tables.spec.ts, import.spec.ts, pdf-export.spec.ts

### Phase 8: Deployment ✅
- GitHub Actions workflow configured
- Auto-deploy on push to main
- Production build verified

### Phase 9: Documentation ✅
- README.md with features, installation, deployment, dependencies, shortcuts, tips

### Phase 10: Help Menu & About Modal ✅
- Keyboard Shortcuts modal (categorized reference)
- About modal (version, build date, commit hash, description)
- Help menu dropdown in Navbar

### Phase 11: Clipboard Functions ✅
- Created `src/utils/clipboard.ts` with copy/cut/paste utilities
- Uses browser Clipboard API with text/plain and text/html formats
- Fallback to `execCommand` for older browsers
- Added Copy/Cut/Paste buttons to Toolbar
- Added Copy/Cut/Paste items to File menu in Navbar
- Wired handlers to editor selection state
- Added 5 unit tests for clipboard utilities

### Phase 12: Microsoft Word Import + MRU 🔄
- Add .docx file import via mammoth.js (converts docx → HTML)
- Parse imported HTML and set as editor content
- Add "Import Word" item to File menu
- Build MRU (Most Recently Used) list in File menu
- Store MRU entries in localStorage (max 5)
- Display recently opened files with click-to-reopen
- Add unit tests for Word import parser and MRU logic

### Phase 13: Auto Page Break on Overflow 🔄
- Calculate content height vs available page height
- Split content at page boundaries
- Insert automatic page breaks when content overflows
- Render multiple page canvases in virtualized viewport
- Update page count display dynamically
- Add tests for overflow calculation logic

---

## Phase 17: True Paginated Content Model (Data-Driven) — IN PROGRESS 🔄

**Goal**: Replace the overlay-alignment architecture with a true paginated content model where each page is an independent, fixed-height container with its own Tiptap editor instance.

### Why
The current architecture stores content as a single flat Tiptap JSON tree in `DocState.content` and renders it through one continuous `DocumentEditor`. The `PaginatedViewport` overlays absolutely-positioned page backgrounds that must align with content flow. This is fragile:
- Browser line-height rarely matches engine-computed line-height → cumulative drift
- PT→PX conversion rounding errors accumulate across pages
- CSS margins/padding on paragraphs break grid alignment
- Sub-pixel font metrics cause misalignment that grows with each page

### Architecture Change
| Current | New |
|---------|-----|
| `DocState.content: Record<string, unknown>` | `DocState.pages: Page[]` |
| 1 Tiptap editor for all content | N Tiptap editors (one per page) |
| Absolute-positioned page backgrounds | Self-contained page containers |
| Mathematical overlay alignment | Natural vertical page stack |
| `DocumentLayoutEngine` computes break positions | Each page renders independently |

### Steps

- [x] 1. Define `Page` interface in `src/types/page.ts` — DONE
- [x] 2. Update `useDocStore.ts` — `pages[]` model, migration from old `content` format — DONE
- [x] 3. Create `PageEditor.tsx` — single page editor with fixed height — DONE
- [x] 4. Create `MultiPageEditor.tsx` — renders N page editors — DONE
- [x] 5. Create `pageOverflow.ts` — overflow detection and content redistribution — DONE
- [x] 6. Rewrite `PaginatedViewport.tsx` — vertical page stack — DONE
- [x] 7. Simplify `PaginationContext.tsx` — per-page geometry — DONE
- [x] 8. Update `PageBreak` extension + `PageBreakView` — visual break indicator — DONE
- [x] 9. Update `fileIO.ts` — migration logic for old format — DONE
- [x] 10. Update `search.ts` — cross-page search/replace — DONE (deferred, uses focused editor)
- [x] 11. Update `Toolbar`, `SearchReplaceModal`, `App.tsx` — DONE (works via focused editor)
- [x] 12. Update `pdfExport.ts` — per-page export — DONE (works via page containers)
- [x] 13. Delete orphaned files: `DocumentEditor.tsx`, `PageBackground.tsx` — DONE
- [x] 14. Update tests for new model — DONE
- [x] 15. Run verification: type-check + test + build — DONE
- [x] 16. Cross-page cursor navigation + page collapse on delete — DONE

### Files

| File | Action |
|------|--------|
| `src/types/page.ts` | **NEW** — Page interface |
| `src/store/useDocStore.ts` | **MODIFY** — pages[] model, migration |
| `src/components/editor/PageEditor.tsx` | **NEW** — single page editor |
| `src/components/editor/MultiPageEditor.tsx` | **NEW** — renders N pages |
| `src/components/editor/DocumentEditor.tsx` | **DELETE** — replaced by PageEditor |
| `src/components/editor/PaginatedViewport.tsx` | **REWRITE** — vertical page stack |
| `src/components/editor/PageBackground.tsx` | **DELETE** — no longer needed |
| `src/components/editor/PaginationContext.tsx` | **SIMPLIFY** — per-page geometry |
| `src/components/editor/nodes/PageBreakView.tsx` | **REWRITE** — visual indicator |
| `src/extensions/PageBreak.ts` | **MODIFY** — page break = new page |
| `src/utils/pageOverflow.ts` | **NEW** — overflow/redistribution |
| `src/utils/fileIO.ts` | **MODIFY** — migration logic |
| `src/utils/search.ts` | **MODIFY** — cross-page search |
| `src/utils/pdfExport.ts` | **MODIFY** — per-page export |
| `src/components/layout/Toolbar/Toolbar.tsx` | **MODIFY** — page break = new page |
| `src/components/layout/SearchReplaceModal.tsx` | **MODIFY** — cross-page nav |
| `src/App.tsx` | **MODIFY** — remove PageNavigation |
| Test files | **UPDATE** — new model tests |

---

## Phase 17: True Paginated Content Model — COMPLETE ✅

**2026-08-04** — Replaced the overlay-alignment architecture with a true paginated content model where each page is an independent, fixed-height container with its own Tiptap editor instance.

### Why
The previous architecture stored content as a single flat Tiptap JSON tree in `DocState.content` and rendered it through one continuous `DocumentEditor`. The `PaginatedViewport` overlaid absolutely-positioned page backgrounds that had to align with content flow. This was fragile:
- Browser line-height rarely matches engine-computed line-height → cumulative drift
- PT→PX conversion rounding errors accumulate across pages
- CSS margins/padding on paragraphs break grid alignment
- Sub-pixel font metrics cause misalignment that grows with each page

### Architecture Change
| Current | New |
|---------|-----|
| `DocState.content: Record<string, unknown>` | `DocState.pages: Page[]` |
| 1 Tiptap editor for all content | N Tiptap editors (one per page) |
| Absolute-positioned page backgrounds | Self-contained page containers |
| Mathematical overlay alignment | Natural vertical page stack |
| `DocumentLayoutEngine` computes break positions | Each page renders independently |

### Key Components
- **`src/types/page.ts`** — `Page` interface with `id` + `content` (Tiptap JSON)
- **`src/components/editor/PageEditor.tsx`** — Single Tiptap editor in fixed-height container with overflow detection
- **`src/components/editor/MultiPageEditor.tsx`** — Renders N page editors, handles overflow redistribution and cross-page navigation
- **`src/components/editor/PaginationContext.tsx`** — Per-page geometry derived from settings (no engine dependency)
- **`src/utils/pageOverflow.ts`** — `splitContentIntoPages` (migration), `redistributeOverflow`, `pullFromNextPage`

### Navigation
- **Arrow Up/Down** — Move caret between lines; cross-page at boundaries
- **PgUp/PgDn** — Jump to previous/next page
- **Enter at end of full page** — Creates new page with overflow content
- **Backspace at start of page** — Merges content into previous page
- **Auto-focus** — First editor focused on page load

### Files

| File | Action |
|------|--------|
| `src/types/page.ts` | **NEW** — Page interface |
| `src/store/useDocStore.ts` | `content` → `pages[]`, migration, `updatePageContent`, `addPageAfter`, `removePage` |
| `src/components/editor/PageEditor.tsx` | **NEW** — Single page editor |
| `src/components/editor/MultiPageEditor.tsx` | **NEW** — Renders N pages |
| `src/components/editor/PaginationContext.tsx` | **SIMPLIFY** — Per-page geometry |
| `src/utils/pageOverflow.ts` | **NEW** — Overflow/redistribution |
| `src/components/editor/DocumentEditor.tsx` | **DELETE** — Replaced by PageEditor |
| `src/components/editor/PageBackground.tsx` | **DELETE** — No longer needed |
| `src/components/editor/PageCanvas.tsx` | **DELETE** — No longer needed |
| `src/hooks/usePagination.ts` | **DELETE** — No longer needed |
| `src/utils/autoPageBreak.ts` | **DELETE** — No longer needed |
| `src/utils/pageOverflow.ts` (old) | **DELETE** — Replaced by new version |
| `src/utils/pageSplit.ts` | **DELETE** — No longer needed |

**Results:** 137 tests across 11 files, lint clean, build succeeds.

---

## Phase 18: Keyboard Navigation & Focus Management — COMPLETE ✅

**2026-08-04** — Implemented cross-page keyboard navigation and focus management.

### Navigation Matrix
| Key | Behavior |
|-----|----------|
| Arrow Down | Next line (same page) OR next page line 1 (if at end) |
| Arrow Up | Previous line (same page) OR prev page last line |
| PgDn | Next page line 1 |
| PgUp | Previous page last line |
| Enter | New line (overflow → new page if full) |
| Backspace | Delete char OR merge with prev page (if at start) |

### Focus Management
- Auto-focus first editor on page load
- Cross-page navigation uses Tiptap editor API for scroll-into-view
- Merge handler positions cursor at join point after merge
- `cursorPositionRef` coordinates cursor positioning across re-renders

### Tests
- `tests/e2e/keyboard-navigation.spec.ts` — 21 Playwright tests for navigation scenarios
- `tests/e2e/merge-focus.spec.ts` — Focus behavior after merge

---

## Phase 19: Template Field Display, Merge & Common Use Cases — IN PROGRESS 🔄

**2026-08-04** — Enhancing template fields with display values, merge functionality, and common use cases.

### Current State
Template fields are inline placeholders (`{{field_name}}`) that don't resolve to actual values. Users expect fields like `{{current_date}}` to display the current date, and `{{page_number}}` to show the page number.

### Design

#### 1. Field Display
- **Edit Mode**: Show placeholder `{{field_name}}` (current behavior)
- **Preview Mode**: Show resolved value (e.g., "15 Aug 2026" for `{{current_date}}`)
- **Toggle**: Button to switch between edit and preview modes

#### 2. Field Resolution
| Field | Resolution |
|-------|------------|
| `{{current_date}}` | Current date (configurable format) |
| `{{document_title}}` | Document title from store |
| `{{page_number}}` | Current page number |
| `{{total_pages}}` | Total page count |
| `{{custom_field}}` | User-defined value (prompted at merge time) |

#### 3. Field Merge
- Replace all field placeholders with resolved values
- Creates a "flat" document with no template fields
- Useful for export, print, or finalizing a document
- Non-destructive: original template preserved until merge

#### 4. Common Use Cases
- **Letters**: Date, recipient name, address blocks
- **Invoices**: Invoice number, date, due date, totals
- **Reports**: Report title, author, date, page X of Y
- **Forms**: Field labels with fillable values
- **Mail Merge**: Import data source, replace fields for each record

### Implementation

#### New Files
- `src/utils/templateFields.ts` — Field resolution and merge logic
- `src/components/layout/FieldMergeModal.tsx` — Merge dialog with options

#### Modified Files
- `src/components/editor/nodes/TemplateFieldView.tsx` — Preview mode display
- `src/components/layout/InsertFieldModal.tsx` — Additional field types
- `src/store/useDocStore.ts` — Add preview mode toggle
- `src/extensions/TemplateField.ts` — Add field type attribute

### Tests
- `src/utils/templateFields.test.ts` — Unit tests for resolution logic
- `tests/e2e/template-fields.spec.ts` — E2E tests for display and merge

---

## Phase 20: Font Size Extension — COMPLETE ✅

**2026-08-03** — Aligned the FontSize extension with the canonical Tiptap specification from `tiptap.dev/docs/editor/extensions/functionality/fontsize`.

### Changes
| File | Change |
|------|--------|
| `src/extensions/FontSize.ts` | `parseHTML` strips quotes per spec; `renderHTML` removes erroneous `line-height: inherit`; `unsetFontSize` uses `setMark + removeEmptyTextStyle` instead of `unsetMark` (which destroyed font-family and color) |
| `src/components/layout/Toolbar/Toolbar.tsx` | Passes `"12px"` (with units) instead of bare `"12"`; added "Default" dropdown option to unset font size; refactored `getFontSize()` with `Set<string>` for mixed-size detection |
| `src/extensions/FontSize.test.tsx` | **NEW** — 8 tests covering apply, unset, color preservation, empty-span cleanup, no line-height leakage, isActive |

**Results:** 172 tests, type-check clean, build succeeds.

---

## Phase 21: Code Deduplication & Dead Code Cleanup — COMPLETE ✅

**2026-08-03** — Removed dead code and deduplicated shared functions.

### Removed
| What | Reason |
|------|--------|
| `src/utils/pageGeometry.ts` (entire file) | Dead — `calculatePageGeometry` never imported; `PaginationContext` uses `buildPageGeometry` from `pagination.ts` |
| `detectOverflow` from `pageOverflow.ts` | Dead — exported but never imported |
| `extractText` from `pageOverflow.ts` | Duplicate of identical function in `pagination.ts` |

### Changed
| File | Change |
|------|--------|
| `src/utils/pagination.ts` | `extractText` now `export`ed |
| `src/utils/pageOverflow.ts` | Imports `extractText` from `pagination.ts` |

**Results:** 172 tests, type-check clean, build succeeds.

---

## Phase 22: Chatbot Integration (LM Studio) — COMPLETE ✅

**2026-08-04** — Integrated an AI chatbot sidebar powered by LM Studio's OpenAI-compatible API.

### Features
| Feature | Description |
|---------|-------------|
| Model selector | Dropdown populated from `/v1/models` endpoint |
| Connection status | Live healthcheck indicator (WiFi icon) |
| Session memory | Full conversation history persisted to localStorage |
| Context window | Up to 65535 tokens with automatic trimming |
| Bi-directional text | Send editor selection ↔ insert AI response at cursor |
| Prompt templates | 3 pre-populated + custom templates (persisted) |
| MD ↔ HTML conversion | Markdown-to-HTML for editor insertion, HTML-to-Markdown for export |

### Architecture
| File | Purpose |
|------|--------|
| `src/types/chat.ts` | ChatMessage, ModelInfo, ChatConfig interfaces |
| `src/utils/chatService.ts` | API client (`/v1/chat/completions`, `/v1/models`) |
| `src/store/useChatStore.ts` | Zustand store with localStorage persistence |
| `src/components/layout/ChatPanel.tsx` | Sidebar UI with settings, templates, bidirectional button |
| `src/utils/markdownToHtml.ts` | MD→HTML converter (no external deps) |
| `src/utils/htmlToMarkdown.ts` | HTML→Markdown converter (round-trip support) |
| `src/types/promptTemplate.ts` | PromptTemplate interface |
| `src/utils/promptTemplates.ts` | Template storage with 3 pre-populated templates |

### Default Configuration
| Setting | Value |
|---------|-------|
| Default model | `google/gemma-4-e2b` |
| Base URL | `http://localhost:1234` |
| Max context | 65535 tokens |
| Selection limit | 200 chars (bidirectional) |

**Results:** 293 tests across 18 files, type-check clean, build succeeds.

---

## Phase 23: Markdown Export — COMPLETE ✅

**2026-08-04** — Added Export Markdown option to File menu that converts the editor HTML to Markdown and downloads it as a `.md` file.

### Implementation
| File | Change |
|------|--------|
| `src/utils/fileIO.ts` | Added `exportToMarkdown(html, filename)` function |
| `src/components/layout/Navbar.tsx` | Added "Export Markdown" menu item (between Export PDF and Print) |
| `src/utils/htmlToMarkdown.ts` | Converts TipTap HTML → Markdown (reverses markdownToHtml) |
| `src/utils/htmlToMarkdown.test.ts` | 23 tests covering headers, formatting, lists, code, links, entities |

### Conversion Coverage
| HTML Element | Markdown Output |
|-------------|-----------------|
| `<h1>`–`<h6>` | `#`–`######` |
| `<strong>`, `<b>` | `**bold**` |
| `<em>`, `<i>` | `*italic*` |
| `<code>` | `` `code` `` |
| `<pre><code>` | Fenced code block |
| `<ul><li>` | `* item` |
| `<ol><li>` | `1. item` |
| `<blockquote>` | `> quote` |
| `<a href="url">` | `[text](url)` |
| `<hr>` | `---` |
| `<p>` | Paragraph with blank line separator |

**Results:** 293 tests, type-check clean, build succeeds.

---

## Phase 24: Search & Replace Enhancements — COMPLETE ✅

**2026-08-04** — Enhanced the existing Search & Replace dialog with missing features.

### Additions
| Feature | Description |
|---------|-------------|
| Replace One | Replaces current match and advances to next (Ctrl+Enter) |
| Regex toggle | Enables regex pattern matching with live validation |
| Live match count | Debounced (150ms) counter updates as you type |
| Keyboard shortcut to open | Ctrl+H or Ctrl+F opens the dialog |
| Escape to close | Closes the panel |
| Keyboard shortcuts modal | Documents all search shortcuts |

### New Functions in `search.ts`
| Function | Purpose |
|----------|--------|
| `buildRegex()` | Shared regex builder with error handling |
| `replaceOnePreservingStyles()` | Replace single match at specified index |
| `resolveMatchPositions()` | Convert node paths to absolute Tiptap positions |
| `getTextLength()` | Calculate node text length recursively |

### Files
| File | Action |
|------|--------|
| `src/utils/search.ts` | Added regex mode, replaceOne, resolveMatchPositions, zero-length match handling |
| `src/utils/search.test.ts` | +27 tests (44 total), regex + replaceOne coverage |
| `src/components/layout/SearchReplaceModal.tsx` | Replace One button, regex checkbox, live count, Ctrl+H shortcut, Esc close |
| `src/components/layout/SearchReplaceModal.test.tsx` | **NEW** — 18 component tests |
| `src/components/layout/KeyboardShortcutsModal.tsx` | Added Search & Replace shortcut category |

**Results:** 333 tests across 19 files, type-check clean, build succeeds.

---

## Future Enhancements (Not Yet Planned)

- [ ] Multi-page content splitting (automatic overflow to next page)
- [ ] Table cell operations (add/delete rows/columns, merge/split)
- [ ] Table formatting (border thickness, cell background color)
- [ ] Custom margins in inches (currently only mm display)
- [ ] Drag-and-drop JSON import (currently file input only)
- [ ] Print-optimized CSS (@media print styles)
- [ ] Fit-to-width zoom option
- [ ] Spell check
- [ ] Collaborative editing
- [ ] Cloud storage integration
