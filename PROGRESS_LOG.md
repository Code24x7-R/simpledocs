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

**Results:** 172 tests pass, type-check clean, build succeeds. |
