# simpledocs — Progress Log

## 2026-08-02 — Initial Implementation

### Phase 1: Setup & Dependencies
- Scaffolded Vite + React + TypeScript project (manual setup, create-vite interactive not available)
- Installed runtime deps: @tiptap/react, @tiptap/pm, @tiptap/starter-kit, @tiptap/extension-table (row/cell/header), @tanstack/react-virtual, lucide-react, clsx, tailwind-merge, zustand, html2pdf.js
- Installed dev deps: tailwindcss, postcss, autoprefixer, vitest, @testing-library/react, jsdom, @playwright/test, @types/node
- Configured: vite.config.ts (with vitest), tsconfig.json (strict), tailwind.config.js, postcss.config.js, .eslintrc.cjs
- Created .github/workflows/deploy.yml for GitHub Pages auto-deploy

### Phase 2: Core Editor
- Implemented `useDocStore` (Zustand) with full DocState schema, localStorage auto-save (500ms debounce)
- Built Navbar: simpledocs brand, editable title, File menu (New, Open JSON, Save JSON, Export PDF, Print, Page Setup), Undo/Redo, Zoom controls
- Built Toolbar: Style dropdown, Font Family, Font Size, Bold/Italic/Underline/Strike, Text Color picker, Highlight Color picker, Alignment, Lists (Bullet/Numbered/Task), Blockquote, Code Block, Horizontal Rule, Table, Insert Field, Page Break
- Built DocumentEditor with Tiptap instance, all extensions, onUpdate → store sync

### Phase 3: Pagination & Page Rendering
- Built PageCanvas: A4/Letter dimensions, configurable margins, header/footer with page numbers
- Built PaginatedViewport: @tanstack/react-virtual for smooth scrolling
- Implemented PageBreak extension with Ctrl+Enter shortcut
- Added zoom transform (75%, 100%, 125%)

### Phase 4: Tables Support
- Integrated Tiptap table extensions (resizable columns)
- Built TableGridModal with 10×10 visual grid picker

### Phase 5: Template/Variable Fields
- Implemented TemplateField custom node (atomic, inline, selectable)
- Built TemplateFieldView React NodeView with hover highlight
- Built InsertFieldModal (4 standard fields + custom field input)

### Phase 6: File Operations
- JSON export: serialize DocState, trigger .json download with sanitized filename
- JSON import: FileReader API, schema validation, hydrate editor
- PDF export: html2pdf.js with exact mm margin matching, page break mode
- Print: window.print() via File menu
- localStorage auto-save with 500ms debounce, restore on startup

### Phase 7: Testing Suite
- 37 unit tests across 5 suites (all passing)
- 4 Playwright E2E spec files (ready, need browser install to run)
- Test coverage: store, utils, extensions, fileIO

### Phase 8: Deployment
- GitHub Actions workflow: checkout → setup Node 20 → npm ci → build (GITHUB_PAGES=true) → deploy dist/
- Production build verified: 1980 modules, ~1.3MB bundle

### Phase 9: Documentation
- Created comprehensive README.md (features, install, deploy, deps, shortcuts, tips, structure)

### Phase 10: Help Menu & About Modal
- Added Help menu dropdown to Navbar (Keyboard Shortcuts, About)
- Built KeyboardShortcutsModal (4 categories, styled kbd elements)
- Built AboutModal (logo, version, build date, commit hash, description)
- Added __GIT_COMMIT_HASH__, __BUILD_TIMESTAMP__, __APP_VERSION__ via Vite define

---

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Manual project scaffold | create-vite interactive not available in this environment |
| Tiptap v3 (upgraded from v2) | Peer dependency resolution required v3 consistency across all extensions |
| Named imports for table extensions | v3 uses named exports, v2 uses default exports |
| localStorage for persistence | No backend required; instant auto-save |
| html2pdf.js for PDF | Client-side only, matches exact mm margins |
| Vitest include pattern | Excludes E2E tests from unit test runs |

---

## Issues Resolved

| Issue | Fix |
|-------|-----|
| `@types/html2pdf.js` doesn't exist | Removed from package.json, added manual type declaration |
| Version mixing (v2/v3 Tiptap) | Upgraded all Tiptap packages to v3 consistently |
| `extension-text-style` v3 imports `getStyleProperty` not in v2 core | Resolved by full v3 upgrade |
| `extension-task-list` v3 depends on `extension-list` | Installed `@tiptap/extension-list` |
| `toggleTaskList` doesn't exist in v3 | Changed to `toggleList('taskList', 'taskItem')` |
| jsdom lacks `URL.createObjectURL` | Stubbed global in tests |
| Mock anchor not real DOM node | Mocked `appendChild`/`removeChild` too |
| `setContent(content, false)` type error in v3 | Changed to `setContent(content, { emitUpdate: false })` |
| Playwright tests picked up by vitest | Added `include: ['src/**/*.{test,spec}.{ts,tsx}']` to vitest config |

## 2026-08-03 — Font Size Extension (Canonical Spec)

### FontSize Extension Fixes
- Aligned `FontSize.ts` with official Tiptap spec from tiptap.dev
- `parseHTML` now strips quotes from `element.style.fontSize` (`replace(/['"]+/g, '')`)
- `renderHTML` no longer adds erroneous `; line-height: inherit`
- `unsetFontSize` uses `setMark('textStyle', { fontSize: null }).removeEmptyTextStyle()` instead of `unsetMark('textStyle')` which destroyed font-family and color attributes
- Toolbar passes `"12px"` (with units) instead of bare `"12"` to `setFontSize`
- Added "Default" option to font size dropdown to unset size
- Refactored `getFontSize()` to use `Set<string>` for cleaner mixed-size detection
- Added 8 new unit tests in `src/extensions/FontSize.test.tsx`

### Code Deduplication & Dead Code Cleanup
- Deleted `src/utils/pageGeometry.ts` — `calculatePageGeometry` was never imported (dead code)
- Removed `detectOverflow` from `pageOverflow.ts` — exported but never imported
- Removed duplicate `extractText` from `pageOverflow.ts` — now imports from `pagination.ts`
- Made `extractText` exported in `pagination.ts`
- Cleaned up accidental `nul` file from filesystem

**Results:** 172 tests pass, type-check clean, build succeeds.

---

## 2026-08-02 — Phases 11–15: Clipboard, Import, Pagination

### Phase 11: Clipboard Functions
- Created `src/utils/clipboard.ts` with copy/cut/paste utilities
- Uses browser Clipboard API with text/plain and text/html formats
- Fallback to `execCommand` for older browsers
- Added Copy/Cut/Paste buttons to Toolbar (with icons)
- Added Copy/Cut/Paste items to File menu in Navbar
- Wired handlers to editor selection state
- 5 unit tests for clipboard utilities
- **Commit:** `34df673` — Tests: 65 → 70

### Phase 12: Microsoft Word Import + MRU
- Added mammoth.js for .docx → HTML conversion
- Created `src/utils/wordImport.ts` with Word import function
- Created `src/utils/mru.ts` with MRU list management (max 5 entries)
- Added "Import Word" item to File menu with .docx file input
- Added MRU list display in File menu with timestamps
- Added `mruList` state to Zustand store
- 19 new tests (15 MRU + 4 Word import)
- Follow-up fixes: wrapped line estimation (`af19ff1`), multi-page splitting (`4bd795b`)
- **Commit:** `0e6f353` — Tests: 89 → 108

### Phase 13: Auto Page Break on Overflow
- Created `src/utils/pageOverflow.ts` with overflow calculation
- PaginatedViewport measures content height after updates
- Renders multiple page canvases when content overflows
- Page count updates dynamically based on content
- 14 new tests for page overflow utilities
- Bugfix B-010: Content no longer causes scrollbars, flows across pages
- **Note:** Superseded by Phase 17's true paginated content model (single-editor refactor)
- **Commit:** `0e6f353` (same commit as Phase 12)

### Phase 14: Search and Replace
- Created `src/utils/search.ts` with find/replace utilities
- Created SearchReplaceModal component with case/whole-word options
- Added Search button to Toolbar
- 22 new tests for search utilities
- Bugfix B-012: Color picker inconsistent (fixed in same commit)
- Follow-up fixes: formatting preservation (`bf5e201`), highlighting (`9fda3fc`), cross-page (`4a80d8d`)
- **Commit:** `67eaeb0` — Tests: 108 → 138

### Phase 15: True Content Splitting (Preparation)
- Created `src/utils/pageSplit.ts` with HTML splitting utilities
- `measureHtmlHeight` for content measurement
- `needsPagination` for overflow detection
- 8 new tests
- Follow-up: Phase 15 refactor (`93a41d3`, `31838ca`) — true continuous document pagination
- **Note:** Superseded by Phase 17's single-editor architecture
- **Commit:** `67eaeb0` (same commit as Phase 14)

---

## 2026-08-03 — Phase 16: Color Picker Fix

### Color Picker Fix
- Bugfix B-012: Color pickers used CSS `group-hover` which was unreliable — changed to click-to-open dropdown with proper state management
- Palette closed prematurely on mouseleave — now stays open during selection, closes on apply
- No way to clear highlight/text color — added "None" and "Default" options
- Eng_AU spelling ("Colour" not "Color") throughout
- Expanded highlight palette to 42 colors organized by hue, larger swatches (28×28px), active color indicator
- Default Tiptap Highlight extension overrode text color with `color: inherit` — created CustomHighlight extension that only sets `background-color`
- Toolbar audit: undo/redo, clear formatting, font family unset, active states
- **Commits:** `67eaeb0`, `5432707`, `0bcad83`, `0f31a1b`, `a44b0f3`

---

## 2026-08-03 — Phase 17: True Paginated Content Model (Single-Editor Refactor)

### Architecture Refactor
- Replaced multi-page architecture (one Tiptap editor per page) with single-editor "Google Docs" model
- `DocState.pages[]` → `DocState.content` (single Tiptap JSON tree)
- Pages are now visual guides computed from content height, CSS `break-after: page` for print/PDF
- Eliminates root cause of bugs B-013 through B-019 (all symptoms of multi-editor complexity)

### Key Components
- **`src/store/useDocStore.ts`** — `content` model, `migrateToContent()` for old format
- **`src/components/editor/DocumentEditor.tsx`** — New single Tiptap instance for entire document
- **`src/components/editor/PaginatedViewport.tsx`** — Visual page overlays at fixed intervals
- **`src/components/editor/PaginationContext.tsx`** — Geometry from settings, page count from content height
- **`src/extensions/PageBreak.ts`** — CSS `break-after: page`, no content splitting

### Removed Files
- `PageEditor.tsx`, `MultiPageEditor.tsx`, `pageOverflow.ts`, `DocumentLayoutEngine.ts`, `types/page.ts`
- `PageBackground.tsx`, `PageCanvas.tsx`, `usePagination.ts`, `autoPageBreak.ts`, `pageSplit.ts`

### Additional Features
- Widow/orphan control for print/PDF (`62b9ca3`) — CSS `orphans`, `widows`, `break-inside: avoid`
- Page Setup modal controls (Widows/Orphans, range 1-10)
- Status bar cursor position indicator (Ln X, Col Y)
- `window.__docStore` exposed for E2E testing

**Commits:** `c188139`, `62b9ca3`, `71508ac` — 158 tests, type-check clean, build succeeds.

---

## 2026-08-03 — Phase 18: Keyboard Navigation & Focus Management

### Navigation
- Arrow Up/Down: move caret between lines; cross-page at boundaries
- PgUp/PgDn: jump to previous/next page
- Enter at end of full page: creates new page with overflow content
- Backspace at start of page: merges content into previous page
- Auto-focus first editor on page load

### E2E Tests
- `tests/e2e/keyboard-navigation.spec.ts` — 21 Playwright tests
- `tests/e2e/merge-focus.spec.ts` — Focus behavior after merge

---

## 2026-08-03 — Phase 19: Template Field Display, Merge & Common Use Cases

### Field Resolution
- `resolveField()` — resolves `{{current_date}}`, `{{document_title}}`, `{{page_number}}`, `{{total_pages}}`, custom fields
- `resolveDate()` — short/long/ISO formats, en-AU locale
- `resolveText()` — resolves fields within text strings
- `mergeFields()` — replaces all template fields with resolved values
- `extractFieldNames()` — extracts all unique field names from document

### UI Components
- **`src/components/layout/FieldMergeModal.tsx`** — Merge dialog with preview, custom field input, merge execution
- **`src/components/layout/InsertFieldModal.tsx`** — Standard fields + custom field input
- **`src/extensions/TemplateField.ts`** — Extension with `insertTemplateField` command
- **`src/components/editor/nodes/TemplateFieldView.tsx`** — NodeView showing `{{fieldName}}`

### Tests
- 27+ unit tests for field resolution and merge logic
- **Commits:** `3724f9b`, `5c5c796` — 27 new tests

---

## 2026-08-03 — Phase 20: Font Size Extension (Canonical Spec)

### FontSize Extension Fixes
- Aligned `FontSize.ts` with official Tiptap spec from tiptap.dev
- `parseHTML` strips quotes from `element.style.fontSize`
- `renderHTML` no longer adds erroneous `; line-height: inherit`
- `unsetFontSize` uses `setMark + removeEmptyTextStyle` instead of `unsetMark` (which destroyed font-family/color)
- Toolbar passes `"12px"` (with units) instead of bare `"12"`
- Added "Default" option to font size dropdown to unset size
- Added 8 new unit tests in `src/extensions/FontSize.test.tsx`

### Code Deduplication & Dead Code Cleanup
- Deleted `src/utils/pageGeometry.ts` — `calculatePageGeometry` was never imported
- Removed `detectOverflow` from `pageOverflow.ts` — exported but never imported
- Removed duplicate `extractText` from `pageOverflow.ts` — now imports from `pagination.ts`
- Made `extractText` exported in `pagination.ts`

**Commits:** `b5e051b`, `10b444c`, `a5850e3`, `7e8a0ca`, `045e851` — 172 tests, type-check clean.

---

## 2026-08-03 — Phase 22: Chatbot Integration (LM Studio)

### Features
- Model selector dropdown populated from `/v1/models` endpoint
- Live healthcheck indicator (WiFi icon)
- Full conversation history persisted to localStorage
- Up to 65535 token context window with automatic trimming
- Bi-directional text flow (editor selection ↔ AI response)
- System prompt templates (3 pre-populated + custom, persisted)
- MD↔HTML conversion for TipTap editor compatibility

### Architecture
- `src/types/chat.ts` — ChatMessage, ModelInfo, ChatConfig interfaces
- `src/utils/chatService.ts` — API client (`/v1/chat/completions`, `/v1/models`)
- `src/store/useChatStore.ts` — Zustand store with localStorage persistence
- `src/components/layout/ChatPanel.tsx` — Sidebar UI with settings, templates, bidirectional button
- `src/utils/markdownToHtml.ts` — MD→HTML converter
- `src/utils/htmlToMarkdown.ts` — HTML→Markdown converter (round-trip)
- `src/types/promptTemplate.ts` — PromptTemplate interface
- `src/utils/promptTemplates.ts` — Template storage with 3 pre-populated templates

**Commit:** `155ee34` — 293 tests (18 files), branch coverage 89.02%.

---

## 2026-08-03 — Phase 23: Markdown Export

### Implementation
- `exportToMarkdown(html, filename)` in `src/utils/fileIO.ts`
- "Export Markdown" option in File menu (between Export PDF and Print)
- Converts TipTap HTML → Markdown and downloads as `.md` file
- 23 tests covering headers, formatting, lists, code, links, entities

**Commit:** `155ee34` (same commit as Phase 22) — 293 tests.

---

## 2026-08-03 — Phase 24: Search & Replace Enhancements

### Additions
- "Replace One" button (replaces current match, advances to next)
- Regex mode toggle with live validation
- Live match count (debounced 150ms) as you type
- Ctrl+H / Ctrl+F keyboard shortcut to open dialog
- Escape key to close panel
- Search shortcuts documented in KeyboardShortcutsModal
- Whole-word matching using lookarounds (no whitespace consumption)
- Zero-length match protection (prevents infinite loops)
- `replaceOnePreservingStyles()` for single-match replacement
- `resolveMatchPositions()` for accurate Tiptap position mapping

**Commit:** `d7b0b42` — 333 tests (44 search + 18 SearchReplaceModal), +40 new tests.

---

## 2026-08-03 — Phase 25: Table Cell Operations

### Operations
- Add Row Above/Below, Delete Row
- Add Column Left/Right, Delete Column
- Merge Cells, Split Cell
- Toggle Header Row, Toggle Header Column

### Implementation
- `src/components/editor/TableContextMenu.tsx` — Right-click context menu
- Auto-positioning to stay within viewport
- Keyboard: Escape closes menu
- Click outside closes menu
- Disabled state for unavailable operations (e.g., merge needs multi-select)
- Wired into DocumentEditor via `contextmenu` DOM event

**Commit:** `27fde66` — 349 tests (20 files), +16 new TableContextMenu tests.

---

## 2026-08-04 — Phases 26–30: Tiptap Feature Completion

### Phase 26: Image Support
- Added `@tiptap/extension-image` (inline: false, allowBase64: true)
- Created `ImageModal.tsx` with upload/URL tabs, file validation (5MB limit), preview, alt text
- Toolbar Image button, File menu "Insert Image" item
- `htmlToMarkdown.ts` updated to handle `<img>` tags (`![alt](src)`)
- `handleImageSubmit` in App.tsx: `editor.chain().focus().setImage()`

### Phase 27: Hyperlinks
- Added `@tiptap/extension-link` (openOnClick: false, autolink: true, linkOnPaste: true)
- Created `LinkModal.tsx` with URL validation (http/https/mailto/tel), display text, remove option
- Toolbar Link button with active state, click-to-toggle behavior
- Ctrl+K keyboard shortcut (dispatches `simpledocs:open-link` custom event)
- `htmlToMarkdown.ts` already handled `<a>` tags

### Phase 28: Bubble Menu
- Added `@tiptap/extension-bubble-menu` + `tippy.js`
- Created `BubbleMenu.tsx` using `@tiptap/react/menus` BubbleMenu component
- Contains: Bold, Italic, Underline, Highlight, Link buttons
- Shows on non-empty selection, positioned via Floating UI
- Wired into `DocumentEditor.tsx` render

### Phase 29: Placeholder
- Added `@tiptap/extension-placeholder` with "Start typing..." text
- Simplest phase — single configuration line in extensions

### Phase 30: Character Count
- Added `@tiptap/extension-character-count`
- Created `textStats.ts` utility (countWords, countSentences, countParagraphs, readingTime, formatReadingTime)
- 15 unit tests for textStats
- `PageNavigation.tsx` status bar shows: words, characters, reading time
- Updates on selection and document changes

**Commits:** pending

---

## 2026-08-04 — Highlight Refactor: BackgroundColor Extension

### Problem
`CustomHighlight` extended `@tiptap/extension-highlight` which is a *separate mark* from `textStyle`. The default Highlight extension forces `color: inherit` which clobbers text colors. The custom version patched `renderHTML` but the architecture was fundamentally wrong.

### Solution
Replaced `CustomHighlight` with `BackgroundColor` from `@tiptap/extension-text-style`. This puts highlight/background-color on the *same* `textStyle` mark as text color, font family, and font size — no `color: inherit` conflict.

### Changes
- **Deleted** `src/extensions/CustomHighlight.ts`
- **Created** `src/extensions/BackgroundColor.test.tsx` — 9 tests
- **Updated** `src/extensions/index.ts` — `BackgroundColor` instead of `CustomHighlight`
- **Merged toolbar** — two separate color pickers (Palette + Highlighter icons) → one combined picker with "Text Colour" / "Highlight" tabs
- **Updated** `BubbleMenu.tsx` — uses `setBackgroundColor`/`unsetBackgroundColor` with toggle logic
- **Removed** stale `Ctrl+Shift-H` shortcut from `KeyboardShortcutsModal.tsx`

**Results:** 388 tests pass (379 + 9 new), type-check clean, build succeeds.

---

## 2026-08-04 — Lint Cleanup: Zero Warnings

### Fixed Issues (41 problems → 0)
- **`src/main.tsx`** — `(window as any)` → `declare global` interface
- **`src/utils/search.ts`** — all `any` → `SerializedNode`/`SerializedMark` local interfaces
- **`src/utils/search.test.ts`** — test data typed as `SerializedNode`, non-null assertions
- **`src/components/editor/TableContextMenu.tsx`** — `editor: any` → `editor: Editor`
- **`src/components/editor/TableContextMenu.test.tsx`** — mock editor typed via `Partial<Editor>`
- **`src/utils/clipboard.test.ts`** — `(global/document/navigator as any)` → `vi.stubGlobal`/`vi.spyOn`
- **`src/utils/wordImport.test.ts`** — `(mammoth.convertToHtml as any)` → typed mock variable
- **`src/extensions/FontSize.test.tsx`** — `testEditor: any` → `Editor | null` with `getEditor()` helper; `require()` → top-level import
- **`src/extensions/PageBreak.test.ts`** — `(renderHTML as any)` → typed `RenderHTMLFn`
- **`src/extensions/TemplateField.test.ts`** — all 3 `any` casts → proper type assertions via `unknown`
- **`src/components/editor/PaginationContext.tsx`** — moved context/interface to `paginationTypes.ts` to fix react-refresh warning
- **`src/components/editor/paginationTypes.ts`** — **New** file
- **`src/components/editor/usePaginationContext.ts`** — **New** file (extracted from PaginationContext.tsx)

**Results:** 0 lint errors, 0 warnings, 388 tests pass, type-check clean.

---

## Summary

| Metric | Value |
|--------|-------|
| Total Phases | 35 (all complete) |
| Test Suites | 29 files |
| Total Tests | 565 passing |
| Coverage | 93.45% line / 81.35% branch |
| Type-check | Clean |
| Lint | 0 errors, 0 warnings |
| Build | Succeeds |
| Architecture | Single-editor (Google Docs model) |

## 2026-08-05 — PDF Export Overhaul (Phase 34)

### [FEATURE] Bitmap PDF → Searchable PDF with pdfmake

**Problem**: PDF export used `html2pdf.js` which rasterized the DOM to a JPEG image embedded in a PDF. Text was not searchable or selectable. Additionally, the export handler looked for `[data-testid="page-canvas"]` elements that didn't exist in the DOM, making PDF export non-functional.

**Solution**:
- Replaced `html2pdf.js` with `pdfmake` — produces real text-based PDFs
- Built `pdfmakeConverter.ts` — recursive TipTap JSON → pdfmake document converter covering all 15 node types
- Lazy-load pdfmake (~1MB) to avoid bloating the main bundle
- Reads directly from `docState.content` instead of scraping the DOM
- Full page setup support: margins, A4/Letter format, portrait/landscape, headers, footers, page numbers

**Files**:
- `src/utils/pdfExport.ts` — Rewritten to use pdfmake with lazy loading
- `src/utils/pdfmakeConverter.ts` — NEW: TipTap JSON → pdfmake converter
- `src/utils/pdfmakeConverter.test.ts` — NEW: 38 tests (all node types, marks, color normalization, page setup)
- `src/utils/pdfExport.test.ts` — NEW: 4 export integration tests
- `src/pdfmake.d.ts` — NEW: Type declarations for pdfmake
- `src/App.tsx` — Removed broken page-canvas DOM scraping, removed unused `useRef`

**Results**: 552 tests pass (28 suites), lint clean, type-check clean, build succeeds.

## 2026-08-06 — Font Embedding + Image Sizing Fixes (Phase 35)

### [BUGFIX] PDF Image Sizing — mm vs pt units

**Problem**: Images in PDF export rendered at ~56mm wide instead of ~160mm (full content area). Root cause: pdfmake interprets `width`/`height` values as points (pt), not millimeters. Code set `width: 160` (meaning 160mm) but pdfmake rendered it as 160pt = 56.4mm.

**Fix**: Added `MM_TO_PT = 72/25.4 = 2.835` conversion factor. Now `160mm × 2.835 = 453.6pt`, which pdfmake correctly renders as 160mm.

**Files**: `src/utils/pdfmakeConverter.ts`

### [BUGFIX] PDF Images — scale down only, not up

**Problem**: Small images (265×151px) were scaled UP to fill content area width, causing blurry output.

**Fix**: Changed `calculateFillDimensions` to CSS `max-width: 100%` behavior — only scales DOWN images that exceed content area; small images remain at natural size.

**Files**: `src/utils/pdfmakeConverter.ts`, `src/utils/pdfmakeConverter.test.ts`

### [BUGFIX] PDF Font 'Roboto' not defined

**Problem**: Exporting PDF threw "Font 'Roboto' in style 'bold' is not defined" error because setting `pdfMakeInstance.fonts = fonts` overwrites the default registry.

**Fix**: Changed default font from 'Roboto' to 'Arial' (always embedded). Embedded 6 standard web font families (24 variants) in `pdfFonts.json`.

**Files**: `src/utils/pdfmakeConverter.ts`, `src/utils/pdfExport.ts`, `src/utils/pdfFonts.json`, `scripts/generateFontVfs.ts`

### [FEATURE] Image dimensions stored at import

**Problem**: PDF converter had no access to image natural dimensions for proper scaling.

**Fix**: `ImageModal` loads image via `new Image()` to get `naturalWidth`/`naturalHeight`, passes to `onSubmit`. `App.tsx` stores as `width`/`height` TipTap attributes. Priority: node attrs > DOM load > 800×400 default.

**Files**: `src/components/layout/ImageModal.tsx`, `src/App.tsx`

### [FEATURE] Gemini Nano Banana image generation

**Problem**: Users requested AI image generation in chat.

**Fix**: Added `generateImage()` to `LlmProvider` interface, implemented in `geminiProvider.ts` using `gemini-3.1-flash-lite-image`. Added Image button, aspect ratio selector, image display with Insert/Save buttons to `ChatPanel.tsx`. Filters models to flash family + Nano Banana with 24h caching.

**Files**: `src/utils/providers/geminiProvider.ts`, `src/components/layout/ChatPanel.tsx`, `src/store/useChatStore.ts`, `src/types/chat.ts`, `src/types/provider.ts`

**Results**: 562 tests pass (29 suites), lint clean, type-check clean, build succeeds.

## 2026-08-06 — Image Generation Fixes (Follow-up)

### [FIX] Switch to free-tier image model + rate limiting

**Problem**: `gemini-3.1-flash-lite-image` has no free tier (limit: 0). Users hitting 429 errors.

**Fix**: Switched to `gemini-2.5-flash-image` (Nano Banana) which has ~500 RPD free tier. Added client-side rate limiting (6s min interval, max 10 RPM). Added free_tier 429 detection with clear billing-required message.

**Files**: `src/utils/providers/geminiProvider.ts`, `src/components/layout/ChatPanel.tsx`, `src/components/layout/ChatPanel.test.tsx`, `src/utils/providers/geminiProvider.test.ts`


