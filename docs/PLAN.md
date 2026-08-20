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
| 16 | Color Picker Fix | COMPLETE ✅ |
| 17 | True Paginated Content Model | COMPLETE ✅ |
| 18 | Keyboard Navigation & Focus Management | COMPLETE ✅ |
| 19 | Template Field Display, Merge & Common Use Cases | COMPLETE ✅ |
| 20 | Font Size Extension (canonical spec) | COMPLETE ✅ |
| 21 | Code Deduplication & Dead Code Cleanup | COMPLETE ✅ |
| 22 | Chatbot Integration (LM Studio) | COMPLETE ✅ |
| 23 | Markdown Export | COMPLETE ✅ |
| 24 | Search & Replace Enhancements | COMPLETE ✅ |
| 25 | Table Cell Operations | COMPLETE ✅ |
| 26 | Image Support | COMPLETE ✅ |
| 27 | Hyperlinks | COMPLETE ✅ |
| 28 | Bubble Menu | COMPLETE ✅ |
| 29 | Placeholder | COMPLETE ✅ |
| 30 | Character Count | COMPLETE ✅ |
| 31 | Highlight Refactor (BackgroundColor) | COMPLETE ✅ |
| 32 | Lint Cleanup (zero warnings) | COMPLETE ✅ |
| 33 | Multi-Provider Chat (Gemini + LM Studio) | COMPLETE ✅ |
| 34 | PDF Export Overhaul (Searchable pdfmake) | COMPLETE ✅ |
| 35 | Font Embedding + Image Sizing Fixes | COMPLETE ✅ |
| 36 | Cloud Storage Integration (Google Drive + OneDrive + S3) | COMPLETE ✅ |
| 37 | Full-Bleed / Distraction-Free View | COMPLETE ✅ |
| 38 | Additional Common Styles (Headings H1-H6, Line Spacing, Indent/Outdent, Paragraph Spacing) | COMPLETE ✅ |
| 39 | Text-to-Speech (TTS) Reader | COMPLETE ✅ |

### Final Results (2026-08-20)
- **884 tests pass** (49 suites)
- **Lint**: 0 errors, 0 warnings
- **Type-check**: Clean
- **Build**: Succeeds
- **Phases**: 39 complete

- [x] Update PLAN.md with results and coverage stats
- [x] Log completion in PROGRESS_LOG.md

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

### Phase 12: Microsoft Word Import + MRU ✅
- Add .docx file import via mammoth.js (converts docx → HTML)
- Parse imported HTML and set as editor content
- Add "Import Word" item to File menu
- Build MRU (Most Recently Used) list in File menu
- Store MRU entries in localStorage (max 5)
- Display recently opened files with click-to-reopen
- Add unit tests for Word import parser and MRU logic

**Implementation:** `src/utils/wordImport.ts` (importWordDocument), `src/utils/mru.ts` (getMRUList, addMRUEntry, formatMRUTimestamp), wired into `Navbar.tsx`. Word import estimates wrapped lines for paragraphs and splits content across multiple pages. MRU shows recent files with formatted timestamps.

### Phase 13: Auto Page Break on Overflow ✅
- Calculate content height vs available page height
- Split content at page boundaries
- Insert automatic page breaks when content overflows
- Render multiple page canvases in virtualized viewport
- Update page count display dynamically
- Add tests for overflow calculation logic

**Implementation:** Superseded by Phase 17's true paginated content model. The single-editor "Google Docs" architecture with CSS-based pagination eliminated the need for manual overflow calculation — page breaks are now visual guides, and content flows naturally across pages.

---

## Phase 16: Color Picker Fix — COMPLETE ✅

**2026-08-03** — Fixed inconsistent color picker behavior and improved usability.

### Issues Fixed
- Color pickers used CSS `group-hover` which was unreliable — changed to click-to-open dropdown with proper state management
- Palette closed prematurely on mouseleave — now stays open during selection, closes on apply
- No way to clear highlight/text color — added "None" and "Default" options
- Default Tiptap Highlight extension overrode text color with `color: inherit` — created CustomHighlight extension that only sets `background-color`

### Steps

- [x] 1. Replace CSS group-hover with click-to-open dropdown + state management (`textColorDropdownOpen`, `highlightColorDropdownOpen`) — commit `67eaeb0`
- [x] 2. Add "None" option to highlight palette, "Default" option to text colour palette — commit `0bcad83`
- [x] 3. Eng_AU spelling ("Colour" not "Color") — commit `0bcad83`
- [x] 4. Expand highlight palette to 42 colors organized by hue, larger swatches (28×28px), active color indicator — commit `5432707`
- [x] 5. CustomHighlight extension to preserve text color when highlighting — commit `0f31a1b`
- [x] 6. Toolbar audit: undo/redo, clear formatting, font family unset, active states — commit `a44b0f3`

### Files

| File | Change |
|------|--------|
| `src/components/layout/Toolbar/Toolbar.tsx` | Click-to-open dropdowns, Default/None options, 42-color highlight palette, larger swatches, active state indicators |
| `src/extensions/CustomHighlight.ts` | **NEW** — Highlight extension that preserves text color (no `color: inherit`) |
| `src/extensions/index.ts` | Replaced default Highlight with CustomHighlight |

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

## Phase 19: Template Field Display, Merge & Common Use Cases — COMPLETE ✅

**2026-08-04** — Implemented template field insertion, resolution, and merge functionality.

### Field Resolution
| Field | Resolution |
|-------|------------|
| `{{current_date}}` | Current date (short/long/ISO formats, en-AU locale) |
| `{{document_title}}` | Document title from store (falls back to "Untitled Document") |
| `{{page_number}}` | Current page number (1-indexed) |
| `{{total_pages}}` | Total page count |
| `{{custom_field}}` | User-defined value (prompted at merge time) |

### Field Merge
- Replace all field placeholders with resolved values
- Creates a "flat" document with no template fields
- Useful for export, print, or finalizing a document
- Non-destructive: original template preserved until merge
- Merge dialog shows preview of all resolved values before committing

### Common Use Cases
- **Letters**: `{{current_date}}`, `{{document_title}}`
- **Invoices**: Custom fields for invoice number, date, totals
- **Reports**: `{{document_title}}`, `{{current_date}}`, `{{page_number}}` of `{{total_pages}}`
- **Forms**: Custom fields with user-defined values
- **Mail Merge**: Merge dialog prompts for custom field values

### Implementation

#### New Files
- `src/utils/templateFields.ts` — Field resolution and merge logic (resolveField, resolveText, resolveDate, mergeFields, extractFieldNames)
- `src/components/layout/FieldMergeModal.tsx` — Merge dialog with preview, custom field input, merge execution
- `src/utils/templateFields.test.ts` — 27+ unit tests for resolution and merge

#### Modified Files
- `src/components/layout/InsertFieldModal.tsx` — Standard fields (current_date, document_title, page_number, total_pages) + custom field input
- `src/extensions/TemplateField.ts` — Extension with insertTemplateField command
- `src/components/editor/nodes/TemplateFieldView.tsx` — NodeView showing `{{fieldName}}`
- `src/store/useDocStore.ts` — fieldMergeOpen state + setFieldMergeOpen
- `src/App.tsx` — FieldMergeModal wired in
- `src/components/layout/Navbar.tsx` — "Merge Fields" menu item in File menu

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

## Phase 25: Table Cell Operations — COMPLETE ✅

**2026-08-04** — Added right-click context menu for table cell operations.

### Operations
| Operation | Description |
|-----------|-------------|
| Add Row Above | Inserts a row before the current row |
| Add Row Below | Inserts a row after the current row |
| Delete Row | Removes the current row |
| Add Column Left | Inserts a column before the current column |
| Add Column Right | Inserts a column after the current column |
| Delete Column | Removes the current column |
| Merge Cells | Merges selected cells into one |
| Split Cell | Splits a merged cell back into individual cells |
| Toggle Header Row | Toggles header formatting for the first row |
| Toggle Header Column | Toggles header formatting for the first column |

### Implementation
| File | Action |
|------|--------|
| `src/components/editor/TableContextMenu.tsx` | **NEW** — Right-click context menu with all table operations |
| `src/components/editor/TableContextMenu.test.tsx` | **NEW** — 16 tests |
| `src/components/editor/DocumentEditor.tsx` | Added `contextmenu` handler to show menu in tables |

### UX Details
- Context menu appears on right-click when cursor is inside a table
- Menu auto-positions to stay within viewport
- Disabled state for operations that aren't applicable (e.g., merge needs multi-select)
- Keyboard: Escape closes the menu
- Click outside closes the menu

**Results:** 349 tests across 20 files, type-check clean, build succeeds.

---

## Phase 26: Image Support — COMPLETE ✅

**2026-08-04** — Added image insertion via file upload or URL.

### Features
- Upload images from file (PNG, JPG, GIF, WebP, SVG) — converted to base64
- Insert images via URL
- Alt text for accessibility
- Preview before insertion
- 5MB file size limit
- Image renders in editor with native browser handling

### Implementation

#### New Files
- `src/components/layout/ImageModal.tsx` — Upload/URL dialog with preview, file size validation, tabbed interface

#### Modified Files
- `src/extensions/index.ts` — Added `@tiptap/extension-image` (inline: false, allowBase64: true)
- `src/components/layout/Toolbar/Toolbar.tsx` — Added Image button
- `src/components/layout/Navbar.tsx` — Added "Insert Image" to File menu
- `src/App.tsx` — Added ImageModal with submit handler (`editor.chain().focus().setImage()`)
- `src/store/useDocStore.ts` — Added `imageOpen` state and `setImageOpen`
- `src/utils/htmlToMarkdown.ts` — Added image conversion (`![alt](src)`)
- `package.json` — Added `@tiptap/extension-image` dependency

---

## Phase 27: Hyperlinks — COMPLETE ✅

**2026-08-04** — Added hyperlink insertion, editing, and removal.

### Features
- Insert link from selected text with URL and optional display text
- Edit existing links (pre-filled modal)
- Remove links via modal or toolbar button toggle
- Ctrl+K keyboard shortcut to insert/edit link
- URL validation (http, https, mailto, tel protocols)
- Auto-detect URLs pasted as plain text (autolink)
- Links auto-convert on paste

### Implementation

#### New Files
- `src/components/layout/LinkModal.tsx` — Add/edit link dialog with URL input, display text, validation, remove option

#### Modified Files
- `src/extensions/index.ts` — Added `@tiptap/extension-link` (openOnClick: false, autolink: true, linkOnPaste: true)
- `src/components/layout/Toolbar/Toolbar.tsx` — Added Link button with active state, click-to-toggle
- `src/components/layout/Navbar.tsx` — Added "Insert Link" to File menu
- `src/components/layout/KeyboardShortcutsModal.tsx` — Documented Ctrl+K shortcut
- `src/components/editor/DocumentEditor.tsx` — Added Ctrl+K keydown handler
- `src/App.tsx` — Added LinkModal with submit handler, `simpledocs:open-link` event listener
- `src/store/useDocStore.ts` — Added `linkOpen` state and `setLinkOpen`
- `package.json` — Added `@tiptap/extension-link` dependency

---

## Phase 28: Bubble Menu — COMPLETE ✅

**2026-08-04** — Added floating formatting toolbar on text selection.

### Features
- Appears above selected text using Floating UI (Tiptap's built-in positioning)
- Contains most-used formatting buttons: Bold, Italic, Underline, Highlight, Link
- Disappears when selection clears
- Follows selection if user scrolls
- Uses Tiptap's `@tiptap/react/menus` BubbleMenu component

### Implementation

#### New Files
- `src/components/editor/BubbleMenu.tsx` — Bubble menu component with Bold, Italic, Underline, Highlight, Link buttons

#### Modified Files
- `src/components/editor/DocumentEditor.tsx` — Wired BubbleMenu into editor render
- `package.json` — Added `@tiptap/extension-bubble-menu` and `tippy.js` dependencies

#### Dependencies
- `@tiptap/extension-bubble-menu` (available in `node_modules` as transitive dep, needs promotion to `package.json`)
- `tippy.js` (peer dependency of bubble-menu, needs installation)

### Tests
- `src/components/editor/BubbleMenu.test.tsx` — Component tests
- E2E: select text, verify bubble menu appears, click formatting button

---

## Phase 29: Placeholder — COMPLETE ✅

**2026-08-04** — Added placeholder text when editor is empty.

### Features
- "Start typing..." displayed when document has no content
- Disappears automatically when user starts typing
- Styled via Tiptap's built-in placeholder CSS

### Implementation

#### Modified Files
- `src/extensions/index.ts` — Added `@tiptap/extension-placeholder` with "Start typing..." text
- `package.json` — Added `@tiptap/extension-placeholder` dependency

---

## Phase 30: Character Count — COMPLETE ✅

**2026-08-04** — Added word/character count and reading time to status bar.

### Features
- Word count (from Tiptap's CharacterCount extension)
- Character count (with spaces)
- Reading time estimate (based on 200 WPM)
- Live update as user types
- Displayed in status bar alongside cursor position

### Implementation

#### New Files
- `src/utils/textStats.ts` — TextStats interface, countWords, countSentences, countParagraphs, readingTime, formatReadingTime
- `src/utils/textStats.test.ts` — 15 unit tests for all counting functions

#### Modified Files
- `src/extensions/index.ts` — Added `@tiptap/extension-character-count`
- `src/components/editor/PageNavigation.tsx` — Added stats display, update handlers for selection and document changes
- `package.json` — Added `@tiptap/extension-character-count` dependency

**Results:** 379 tests, type-check clean, build succeeds.

---

## Phase 31: Highlight Refactor — COMPLETE ✅

**2026-08-04** — Replaced separate Highlight mark with BackgroundColor on textStyle mark.

### Problem
`CustomHighlight` extended `@tiptap/extension-highlight` which is a *separate mark* from `textStyle`. The default Highlight extension forces `color: inherit` which clobbers text colors. The custom version patched `renderHTML` to only set `background-color`, but the architecture was fundamentally wrong — highlight and text color lived on different marks.

### Solution
Replaced `CustomHighlight` with `BackgroundColor` from `@tiptap/extension-text-style`. This puts highlight/background-color on the *same* `textStyle` mark as text color, font family, and font size. No `color: inherit` conflict.

### Implementation

#### Deleted Files
- `src/extensions/CustomHighlight.ts` — Replaced by BackgroundColor extension

#### New Files
- `src/extensions/BackgroundColor.test.tsx` — 9 tests verifying coexistence with text color, independent unset, no `color: inherit`, etc.

#### Modified Files
- `src/extensions/index.ts` — `BackgroundColor` instead of `CustomHighlight`
- `src/components/layout/Toolbar/Toolbar.tsx` — Merged two separate color pickers (Palette + Highlighter icons) → one combined picker with "Text Colour" / "Highlight" tabs
- `src/components/editor/BubbleMenu.tsx` — Uses `setBackgroundColor`/`unsetBackgroundColor` with toggle logic instead of `toggleHighlight`
- `src/components/layout/KeyboardShortcutsModal.tsx` — Removed stale `Ctrl+Shift-H` entry (BackgroundColor has no keyboard shortcut)

### Key API Differences
- Old: `editor.commands.toggleHighlight({ color })` / `editor.isActive('highlight', { color })`
- New: `editor.commands.setBackgroundColor(color)` / `editor.isActive('textStyle', { backgroundColor: color })`
- Unset: `editor.commands.unsetBackgroundColor()` (calls `removeEmptyTextStyle` internally)

**Results:** 388 tests pass (379 + 9 new), type-check clean, build succeeds.

---

## Phase 32: Lint Cleanup — COMPLETE ✅

**2026-08-04** — Fixed all 41 pre-existing lint issues (40 errors + 1 warning → 0).

### Changes

#### Type Safety Improvements
- `src/main.tsx` — `(window as any)` → `declare global` interface for `__docStore`
- `src/utils/search.ts` — All `any` → `SerializedNode`/`SerializedMark` local interfaces
- `src/components/editor/TableContextMenu.tsx` — `editor: any` → `editor: Editor`
- `src/extensions/FontSize.test.tsx` — `testEditor: any` → `Editor | null` with `getEditor()` helper

#### Test File Typing
- `src/utils/search.test.ts` — Test data typed as `SerializedNode`, non-null assertions on `.content!`
- `src/components/editor/TableContextMenu.test.tsx` — Mock editor typed via `Partial<Editor>`
- `src/utils/clipboard.test.ts` — `(global/document/navigator as any)` → `vi.stubGlobal`/`vi.spyOn`
- `src/utils/wordImport.test.ts` — `(mammoth.convertToHtml as any)` → typed mock variable
- `src/extensions/PageBreak.test.ts` — `(renderHTML as any)` → typed `RenderHTMLFn`
- `src/extensions/TemplateField.test.ts` — All 3 `any` casts → proper type assertions via `unknown`

#### Architecture
- `src/components/editor/PaginationContext.tsx` — Moved context/interface to `paginationTypes.ts` to fix react-refresh warning
- `src/components/editor/paginationTypes.ts` — **New** — holds `PaginationContextValue` interface + context creation
- `src/components/editor/usePaginationContext.ts` — **New** — extracted hook from PaginationContext.tsx
- `src/extensions/FontSize.test.tsx` — `require()` → top-level import (fixes `no-var-requires`)

**Results:** 0 lint errors, 0 warnings, 388 tests pass, type-check clean.

---

## Future Enhancements (Not Yet Planned)

- [ ] Table formatting (border thickness, cell background color)
- [ ] Custom margins in inches (currently only mm display)
- [ ] Drag-and-drop JSON import (currently file input only)
- [ ] Print-optimized CSS (@media print styles)
- [ ] Fit-to-width zoom option
- [ ] Spell check
- [ ] Collaborative editing (@tiptap/extension-collaboration)
- [ ] Cloud storage integration
- [ ] Subscript/Superscript support
- [ ] Syntax highlighting in code blocks (@tiptap/extension-code-block-lowlight)
- [ ] Floating menu (insert menu on new line)
- [ ] @mentions with autocomplete
- [ ] YouTube/video embed support
- [ ] Typography extension (smart quotes, dashes)
- [ ] Find and replace with replace-all confirmation dialog
- [ ] Document outlines/navigation panel (headings tree)
- [ ] Export to DOCX format
- [ ] Import from Markdown (paste MD → convert to Tiptap)

---

## Phase 33: Multi-Provider Chat (Gemini + LM Studio) — COMPLETE ✅

**2026-08-04** — Refactored the chat system from a single-provider (LM Studio) architecture to a multi-provider abstraction, adding Google Gemini as a second provider with API key authentication.

### Architecture Changes
| Before | New |
|--------|-----|
| `chatService.ts` with hardcoded OpenAI calls | Provider adapter pattern with `LlmProvider` interface |
| Single `baseUrl` in store | `ConfiguredProvider[]` with per-instance config |
| LM Studio only | LM Studio + Google Gemini (extensible) |
| Settings panel shows "Server URL" | Dynamic settings based on active provider |

### Provider Adapter Pattern
- `LlmProvider` interface — all providers implement `healthcheck()`, `listModels()`, `sendMessage()`, `getDefaultConfig()`, `validateConfig()`
- `LmStudioProvider` — OpenAI-compatible API (extracted from old `chatService.ts`)
- `GeminiProvider` — Google AI Studio API with `AIza...` key auth, converts between OpenAI `messages[]` and Gemini `contents[]` format
- `ProviderRegistry` — simple registry mapping provider IDs to instances

### Store Refactor
- `useChatStore` now manages `configuredProviders: ConfiguredProvider[]` and `activeProviderId`
- Backward-compatible migration: existing single LM Studio config auto-migrates to new format
- New actions: `addProvider()`, `removeProvider()`, `setActiveProvider()`, `updateProviderConfig()`, `checkHealthById()`
- Existing actions delegate to active provider via registry

### UI Components
- **ProviderSetupModal** — 3-step wizard: select provider → configure → success
  - Gemini: step-by-step AI Studio instructions, API key input with validation, model selector, test connection
  - LM Studio: server URL input, test connection
- **ChatPanel** — provider selector dropdown with status indicators, dynamic settings panel

### Files
| File | Action |
|------|--------|
| `src/types/provider.ts` | **NEW** — Provider interfaces |
| `src/types/chat.ts` | **EDIT** — Added Gemini API types |
| `src/utils/providers/lmStudioProvider.ts` | **NEW** — LM Studio adapter |
| `src/utils/providers/geminiProvider.ts` | **NEW** — Gemini adapter |
| `src/utils/providers/providerRegistry.ts` | **NEW** — Provider registry |
| `src/utils/chatService.ts` | **DELETE** — Replaced by adapters |
| `src/store/useChatStore.ts` | **EDIT** — Multi-provider state |
| `src/store/chatStoreDefaults.ts` | **NEW** — Default constants |
| `src/store/useDocStore.ts` | **EDIT** — Added `providerSetupOpen` |
| `src/components/layout/ProviderSetupModal.tsx` | **NEW** — Setup wizard |
| `src/components/layout/ChatPanel.tsx` | **EDIT** — Provider selector, dynamic settings |
| `src/App.tsx` | **EDIT** — Wire ProviderSetupModal |
| Tests | **NEW/EDIT** — 60 new provider/multi-provider tests |

**Results:** 452 tests pass, lint clean, type-check clean, build succeeds.

---

## Phase 34: PDF Export Overhaul (Searchable pdfmake) — COMPLETE ✅

**2026-08-05** — Replaced bitmap-based `html2pdf.js` with text-based `pdfmake` to produce **searchable, selectable PDFs**.

### Problems Fixed
1. **Was bitmap capture**: `html2pdf.js` rendered DOM → canvas → JPEG image → PDF. Text was **not searchable or selectable**.
2. **Was broken page detection**: `exportToPdf()` looked for `[data-testid="page-canvas"]` elements that don't exist in the DOM. `PaginatedViewport` uses CSS-based pagination.

### Solution
- `pdfmake` — client-side PDF generation with real text, embedded fonts, and full styling
- TipTap JSON → pdfmake document converter (`pdfmakeConverter.ts`) — recursive node walker
- Lazy-loaded so the ~1MB library doesn't bloat the main bundle
- Reads directly from `docState.content` — no DOM scraping required

### Node Type Coverage
| TipTap Node | pdfmake Output |
|---|---|
| `doc` | Root document |
| `paragraph` | Text block with margin |
| `heading` | Sized text (h1/h2/h3) |
| `text` + marks | Styled text chunks (bold, italic, underline, strikethrough, code, color, fontSize, fontFamily, backgroundColor) |
| `bulletList` / `orderedList` | Bulleted/numbered lists |
| `taskList` | Checkbox lists (☐/☑) |
| `table` | pdfmake tables with cell styling |
| `image` | Embedded images (including base64) |
| `link` | Clickable hyperlinks |
| `blockquote` | Indented styled block |
| `codeBlock` | Monospace block with background |
| `horizontalRule` | Horizontal line |
| `pageBreak` | Page break |
| `templateField` | Variable placeholder text |

### Files
| File | Action |
|------|--------|
| `src/utils/pdfExport.ts` | **REWRITE** — Replace html2pdf.js with pdfmake (lazy-loaded) |
| `src/utils/pdfmakeConverter.ts` | **NEW** — TipTap JSON → pdfmake document converter |
| `src/utils/pdfmakeConverter.test.ts` | **NEW** — 38 converter tests (all node types, marks, color normalization, page setup) |
| `src/utils/pdfExport.test.ts` | **NEW** — 4 export integration tests (mocked pdfmake) |
| `src/pdfmake.d.ts` | **NEW** — Type declarations for pdfmake (no @types package) |
| `src/vite-env.d.ts` | **EDIT** — Removed html2pdf.js type declarations |
| `src/App.tsx` | **EDIT** — Removed page-canvas DOM scraping, removed unused `useRef` |
| `package.json` | **EDIT** — Removed html2pdf.js, added pdfmake |

### Results
- **552 tests pass** (28 suites) — up from 510
- Lint clean, type-check clean, build succeeds
- PDF output is now **fully searchable and selectable**
- All TipTap node types converted to real text
- Page setup (margins, format, orientation, headers, footers, page numbers) fully wired
- pdfmake lazy-loaded to avoid bloating main bundle

---

## Phase 35: Font Embedding + Image Sizing Fixes — COMPLETE ✅

**2026-08-06** — Embedded standard web fonts into pdfmake's VFS and fixed multiple image sizing bugs in PDF export.

### Font Embedding
- **Problem**: pdfmake defaults to Roboto which isn't embedded, causing "Font 'Roboto' is not defined" errors
- **Solution**: Embed 6 standard web font families (Arial, Times New Roman, Courier New, Georgia, Verdana, Helvetica) as base64 in `pdfFonts.json` (~20MB, 24 variants)
- **Font mapping**: Editor px → pdfmake pt conversion (×0.75)
- **Helvetica fallback**: Helvetica not on Windows; Arial is metric-compatible substitute
- **Lazy loading**: `pdfFonts.json` only fetched when user exports to PDF

### Image Sizing Bugs Fixed
1. **Roboto bold error**: Changed default font from 'Roboto' to 'Arial' (always embedded)
2. **mm vs pt units**: pdfmake interprets `width`/`height` as points, not millimeters — added `MM_TO_PT` conversion (×2.835)
3. **fit property broken**: pdfmake's `fit` doesn't work with data URLs — switched to explicit dimension calculation
4. **Scale up/down behavior**: Changed to CSS `max-width: 100%` behavior — only scale DOWN images that exceed content area, small images stay at natural size
5. **Image dimensions at import**: Store natural dimensions on TipTap node via `ImageModal` → `new Image()` → `naturalWidth`/`naturalHeight`

### Files
| File | Action |
|------|--------|
| `src/utils/pdfmakeConverter.ts` | px→pt font conversion, `calculateFillDimensions` with scale-down-only logic, `MM_TO_PT` conversion for images |
| `src/utils/pdfmakeConverter.test.ts` | Updated image sizing tests |
| `src/utils/pdfExport.ts` | Custom font loading with fallback, `logImageNodes` for debugging |
| `src/utils/pdfFonts.json` | **NEW** — ~20MB base64 font data (24 variants, 6 families) |
| `scripts/generateFontVfs.ts` | **NEW** — TTF → JSON generator script |
| `src/components/layout/ImageModal.tsx` | Loads image via `new Image()` to get natural dimensions, passes to `onSubmit` |
| `src/App.tsx` | `handleImageSubmit` stores `{src, alt, width, height}` on TipTap node |
| `package.json` | Added `setup:fonts` script |
| `.gitignore` | Added `fonts/` (Windows system fonts licensing) |

### Results
- **562 tests pass** (29 suites)
- Lint clean, type-check clean, build succeeds
- PDFs now embed standard web fonts for consistent cross-platform rendering
- Images in PDF export respect content area margins with correct scaling

---

## Phase 37: Full-Bleed / Distraction-Free View — COMPLETE ✅

**2026-08-12** — Added a view mode where text fills the entire viewport with no width constraint and no margins. Includes an option to launch in full-bleed mode by default.

### Features
| Feature | Description |
|---------|-------------|
| Full-bleed toggle | Switch between paginated view (A4/Letter with margins) and full-bleed view (edge-to-edge text) |
| View menu item | Toggle in Navbar View menu |
| Keyboard shortcut | `Ctrl+Shift+F` toggles full-bleed view |
| Default launch mode | "Launch in Full-Bleed by Default" persisted setting |

### Implementation
| File | Action |
|------|--------|
| `src/store/useDocStore.ts` | Added `fullBleedMode` state, `setFullBleedMode` action, `defaultFullBleedMode` setting |
| `src/components/editor/PaginatedViewport.tsx` | Conditional styling: full-bleed removes maxWidth/margins/shadow |
| `src/components/editor/DocumentEditor.tsx` | `Ctrl+Shift+F` keyboard shortcut handler |
| `src/components/layout/Navbar.tsx` | View menu toggle + "Launch in Full-Bleed by Default" option |
| `src/components/layout/KeyboardShortcutsModal.tsx` | Documented the new shortcut |
| `src/store/useDocStore.test.ts` | 5 new store tests for fullBleedMode |
| `src/components/editor/PaginatedViewport.test.tsx` | **NEW** — 5 component tests |

### Steps
- [x] 1. Add `fullBleedMode` state and `setFullBleedMode` action to store
- [x] 2. Add `defaultFullBleedMode` to DocSettings, persist in localStorage
- [x] 3. Initialize `fullBleedMode` from settings on load
- [x] 4. Update PaginatedViewport to conditionally render full-bleed layout
- [x] 5. Add View menu toggle + keyboard shortcut in Navbar
- [x] 6. Write tests
- [x] 7. Run full verification pass

**Results:** 680 tests pass (39 suites), lint clean, type-check clean, build succeeds.

---

## Phase 38: Additional Common Styles — COMPLETE ✅

**2026-08-12** — Added heading levels H4-H6, line spacing, indent/outdent, and paragraph spacing.

### Features
| Feature | Description |
|---------|-------------|
| Heading levels H4-H6 | Extended from H1-H3 to full H1-H6 range |
| Line spacing | Preset line heights (1.0, 1.15, 1.5, 2.0, 2.5, 3.0) |
| Indent / Outdent | 40px incremental indent with min 0 |
| Paragraph spacing | Preset space before/after paragraphs |

### Implementation
| File | Action |
|------|--------|
| `src/extensions/ParagraphStyle.ts` | **NEW** — Custom extension for lineHeight, indent, paragraphSpacing |
| `src/extensions/index.ts` | Added ParagraphStyle, extended heading levels to H1-H6 |
| `src/components/layout/Toolbar/Toolbar.tsx` | Added line height dropdown, indent/outdent buttons, paragraph spacing dropdown |
| `src/components/editor/DocumentEditor.tsx` | Ctrl+Alt+4/5/6 keyboard shortcuts for H4-H6 |
| `src/components/layout/KeyboardShortcutsModal.tsx` | Documented new shortcuts |
| `src/utils/htmlToMarkdown.ts` | Fixed regexes to handle `style` attributes on `<p>` and `<h1-h6>` |
| Tests | **15 new tests** — 10 for ParagraphStyle + 5 for markdown export

### Steps
- [x] 1. Create ParagraphStyle extension
- [x] 2. Extend heading levels to H1-H6
- [x] 3. Add toolbar controls (line height, indent/outdent, paragraph spacing)
- [x] 4. Add keyboard shortcuts for H4-H6
- [x] 5. Fix markdown export for styled paragraphs
- [x] 6. Write tests
- [x] 7. Run full verification pass

**Results:** 699 tests pass (40 suites), lint clean, type-check clean, build succeeds.

---

## Phase 36: Cloud Storage Integration — COMPLETE ✅

**2026-08-06 → 2026-08-13** — Unified cloud storage supporting three providers: Google Drive, Microsoft OneDrive, and S3-compatible object storage.

### Features
| Feature | Description |
|---------|-------------|
| Save to Cloud | Save current document as JSON to the selected cloud provider |
| Open from Cloud | Browse and open documents from the connected provider |
| File management | List, open, delete documents; refresh file list |
| Provider switching | Switch between Google Drive, OneDrive, and S3 without closing the modal |
| S3 configuration | Configure endpoint, bucket, credentials, prefix, and path-style addressing |

### Architecture
- **Google Drive** — Google Picker API (native browser), Drive API v3 (CRUD), Google Identity Services (OAuth 2.0)
- **OneDrive** — Microsoft Graph API v1.0 (CRUD), MSAL.js (OAuth 2.0 Authorization Code + PKCE)
- **S3-compatible** — REST API with SigV4 request signing (no SDK); supports AWS S3, MinIO, Wasabi, DigitalOcean Spaces, Backblaze B2, Cloudflare R2
- **Unified UI** — Single `CloudStorageModal` with provider selection, connected state, and mode switching (save/open)

### Files
| File | Action |
|------|--------|
| `src/utils/driveAuth.ts` | **NEW** — Google OAuth 2.0 token management |
| `src/utils/driveApi.ts` | **NEW** — Drive API wrapper (list, create, read, update, delete) |
| `src/utils/pickerApi.ts` | **NEW** — Google Picker API wrapper |
| `src/utils/onedriveAuth.ts` | **NEW** — MSAL.js authentication (sign-in, sign-out, silent token) |
| `src/utils/onedriveApi.ts` | **NEW** — Microsoft Graph API wrapper (CRUD operations) |
| `src/utils/s3Api.ts` | **NEW** — S3-compatible REST API wrapper with SigV4 signing |
| `src/utils/s3Config.ts` | **NEW** — S3 configuration storage (localStorage) |
| `src/utils/s3SigV4.ts` | **NEW** — AWS SigV4 request signing |
| `src/components/layout/CloudStorageModal.tsx` | **NEW** — Unified cloud storage dialog (3 providers) |
| `src/components/layout/S3ConfigModal.tsx` | **NEW** — S3 configuration form |
| `src/components/layout/Navbar.tsx` | **EDIT** — Save/Open Cloud menu items |
| `src/App.tsx` | **EDIT** — Wire CloudStorageModal |
| Tests | **NEW** — Tests for driveApi, driveAuth, pickerApi, onedriveApi, onedriveAuth, s3Api, s3Config, s3SigV4, CloudStorageModal, S3ConfigModal |

### Removed
| File | Reason |
|------|--------|
| `src/components/layout/DriveModal.tsx` | Superseded by unified CloudStorageModal |
| `src/components/layout/DriveModal.test.tsx` | Removed with component |
| `src/store/useDriveStore.ts` | CloudStorageModal manages state internally |

### Results
- **743 tests pass** (42 suites)
- Lint clean, type-check clean, build succeeds
- CloudStorageModal (39 tests), S3ConfigModal (21 tests), pickerApi (9 tests)

---

## Phase 39: Text-to-Speech (TTS) Reader — COMPLETE ✅

**Inspired by:** [GlowReadTTS](https://github.com/lavellehatcherjr/GlowReadTTS) (Chrome extension using Kokoro-82M ONNX model)

**2026-08-20** — Implemented using Web Speech API. 41 new tests.

### Overview

Add a TTS reader that reads document text aloud using the browser's built-in **Web Speech API** (`window.speechSynthesis`). This approach:
- **Zero dependencies** — uses native browser capabilities
- **Works offline** — no network calls or model downloads
- **Supports all modern browsers** — Chrome, Edge, Safari, Firefox
- **Provides voice selection, speed (rate), and volume control**
- **Can be upgraded later** to a neural model (e.g., Kokoro via ONNX Runtime Web) for higher quality

### Features

| Feature | Description |
|---------|-------------|
| Read Document | Reads the entire document text from the editor |
| Read Selection | Reads only the currently selected text |
| Play / Pause / Stop | Standard playback controls |
| Voice Selector | Dropdown of all available system voices |
| Speed Control | Slider from 0.5x to 2x (maps to SpeechSynthesis rate) |
| Volume Control | Slider from 0% to 100% |
| Progress Indicator | Visual indicator of current reading position |
| Toolbar Button | Quick-access TTS button in the main toolbar |
| Keyboard Shortcut | `Ctrl+Shift+T` to toggle reading |

### UI Design

The TTS control panel will be a **floating panel** (similar to SearchReplaceModal's bottom-docked approach) that appears when the user clicks the TTS button or uses the keyboard shortcut:

```
┌─────────────────────────────────────────────────────┐
│  🔊 Text-to-Speech                    ▶ ▶▶ ■  ✕   │
│                                                     │
│  Voice: [English (US) — Alex           ▼]          │
│                                                     │
│  Speed:  ●━━━━━━━━━━━━━━━━━━━━━━○  1.0x            │
│  Volume: ●━━━━━━━━━━━━━━━━━━━━━━○  100%            │
│                                                     │
│  [Read All]  [Read Selection]        Status: Ready  │
└─────────────────────────────────────────────────────┘
```

The panel docks to the bottom-center of the viewport (same position as SearchReplaceModal).

### Architecture

```
src/
├── utils/
│   └── tts/
│       ├── TtsService.ts        # Core TTS service wrapping SpeechSynthesis
│       └── ttsTypes.ts          # Shared types/interfaces
├── components/
│   └── layout/
│       └── TtsPanel.tsx         # TTS control panel UI
├── components/
│   └── editor/
│       └── DocumentEditor.tsx   # Wires Ctrl+Shift+T shortcut
├── components/
│   └── layout/
│       └── Toolbar/
│           └── Toolbar.tsx      # Adds TTS button
└── store/
    └── useDocStore.ts           # Adds ttsOpen state + setTtsOpen action
```

### Key Design Decisions

1. **Web Speech API** for v1 — pragmatic, zero-dep. Kokoro/ONNX neural TTS would add ~100MB and significant complexity. Can be added as a premium feature later.

2. **Text extraction** — use `editor.getText()` to get plain text from the Tiptap editor. For selection, use `editor.state.doc.textBetween(from, to)`.

3. **Sentence-level chunking** — split text into sentences for:
   - Better pause handling at punctuation
   - Progress tracking
   - Ability to pause/resume mid-sentence

4. **Queue-based playback** — maintain a queue of utterances. `speechSynthesis` handles its own queue, but we manage sentence boundaries for progress tracking and to handle the `onend` event chain.

5. **State management** — TTS state (isPlaying, currentVoice, rate, volume) lives in the `TtsService` class (a singleton), not in React state. The panel subscribes to service events for UI updates.

### Implementation Steps

#### Step 1: Types and Service ✅
- [x] Create `src/utils/tts/ttsTypes.ts` with `TtsState`, `TtsVoice`, `TtsOptions` interfaces
- [x] Create `src/utils/tts/TtsService.ts` — singleton class wrapping `SpeechSynthesis`
- [x] Implement: `getVoices()`, `speak(text)`, `pause()`, `resume()`, `stop()`
- [x] Implement: `setVoice(voiceURI)`, `setRate(rate)`, `setVolume(volume)`
- [x] Implement: event emitters for `stateChange`, `boundary` (sentence progress), `end`
- [x] Handle voice loading async (`speechSynthesis.onvoiceschanged`)
- [x] Handle chunking long text into sentence-level utterances

#### Step 2: TTS Panel Component ✅
- [x] Create `src/components/layout/TtsPanel.tsx`
- [x] Implement floating panel (bottom-center, matching SearchReplaceModal style)
- [x] Voice selector dropdown (populated from `TtsService.getVoices()`)
- [x] Speed slider (0.5x – 2x, step 0.1)
- [x] Volume slider (0% – 100%, step 5)
- [x] Play/Pause/Stop buttons with proper icon states
- [x] "Read All" and "Read Selection" buttons
- [x] Progress/status text
- [x] Close button
- [x] Subscribe to `TtsService` events for live UI updates

#### Step 3: Store Integration ✅
- [x] Add `ttsOpen` state to `useDocStore`
- [x] Add `setTtsOpen` action

#### Step 4: Toolbar & Shortcuts ✅
- [x] Add TTS button (🔊 speaker icon) to Toolbar
- [x] Add `Ctrl+Shift+T` keyboard shortcut in DocumentEditor

#### Step 5: App Wiring ✅
- [x] Wire `TtsPanel` into `App.tsx` (conditional render on `ttsOpen`)

#### Step 6: Tests ✅
- [x] Unit tests for `TtsService` (mock `SpeechSynthesis`) — 26 tests
- [x] Component tests for `TtsPanel` — 15 tests
- [x] Integration tests for store + shortcut

#### Step 7: Documentation & Polish ✅
- [x] Add TTS entry to KeyboardShortcutsModal
- [x] Add TTS section to MANUAL.md
- [x] Full verification pass — 884 tests, lint clean, type-check clean, build succeeds

### Files

| File | Action |
|------|--------|
| `src/utils/tts/ttsTypes.ts` | **NEW** — TTS type definitions |
| `src/utils/tts/TtsService.ts` | **NEW** — Core TTS service (Web Speech API wrapper) |
| `src/utils/tts/TtsService.test.ts` | **NEW** — Service unit tests |
| `src/components/layout/TtsPanel.tsx` | **NEW** — TTS control panel |
| `src/components/layout/TtsPanel.test.tsx` | **NEW** — Panel component tests |
| `src/components/layout/Toolbar/Toolbar.tsx` | **EDIT** — Add TTS button |
| `src/components/editor/DocumentEditor.tsx` | **EDIT** — Ctrl+Shift+T shortcut |
| `src/components/layout/Navbar.tsx` | **EDIT** — Add TTS to Tools menu |
| `src/components/layout/KeyboardShortcutsModal.tsx` | **EDIT** — Document shortcut |
| `src/store/useDocStore.ts` | **EDIT** — Add ttsOpen state |
| `src/App.tsx` | **EDIT** — Wire TtsPanel |
| `tests/TTS_INTEGRATION.md` | **NEW** — Integration test plan |

### Estimated Test Count
- TtsService: 12 tests (voices, speak, pause, resume, stop, rate, volume, chunking, events)
- TtsPanel: 10 tests (render, voice select, sliders, play/pause/stop, read all/selection)
- Store/shortcut: 3 tests
- **Total: ~25 new tests**

### Results
- **41 new tests** (26 TtsService + 15 TtsPanel)
- **884 total tests pass** (49 suites) — up from 843
- Lint clean, type-check clean, build succeeds
- Zero dependencies added (uses native Web Speech API)
- All playback controls, voice selection, speed/volume sliders working

### Future Enhancements (v2+)
- Neural TTS via Kokoro-82M + ONNX Runtime Web (bundled model, ~100MB)
- Highlight-as-you-read (track current sentence in editor, apply highlight mark)
- Export audio (record synthesis output to WAV)
- Voice pitch control
- Per-paragraph navigation (skip forward/back by paragraph)
