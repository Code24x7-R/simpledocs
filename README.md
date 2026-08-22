# SimpleDocs

A modern, browser-based paginated WYSIWYG document editor with Microsoft Word / Google Docs feature parity. Fully client-side — no backend.

**Live demo:** [[https://simpledocs.mouseclick.au](https://simpledocs.mouseclick.au)]
**User manual:** [MANUAL.md](./MANUAL.md)

## Overview

SimpleDocs is a single-page app built with React, TypeScript, and Tiptap. It provides a paginated document editing experience in the browser with support for rich text, tables, images, template fields, and AI chat integration.

The editor uses a continuous-scroll architecture where a single Tiptap instance renders all content, with page breaks computed from content height for print/PDF export.

### Key Capabilities

- Rich text editing (bold, italic, underline, strikethrough, colors, highlight, fonts, line spacing, indent/outdent)
- Page layout (A4/Letter, margins, headers, footers, page breaks, full-bleed view)
- Tables with context-menu operations (merge/split cells, add/delete rows/columns)
- Template fields (`{{variable}}` badges with merge support)
- Image insertion (upload as base64 or URL)
- Hyperlinks (insert/edit/remove, auto-link on paste, internal TOC anchors)
- Table of Contents generation with heading anchor links
- Search & replace (regex, case-sensitive, whole-word)
- File I/O (JSON save/load, PDF export, Markdown export, Word import)
- Sharing — copy link (self-contained URL), native share sheet, save/open as file (no accounts needed)
- Cloud storage (Google Drive, OneDrive, S3-compatible) — advanced, optional
- AI chat panel (multi-provider: LM Studio, Google Gemini)
- Named ranges (Excel-like named cell references)
- Text-to-Speech reader (planned)
- Zoom (50%–200% with step controls), undo/redo, localStorage auto-save

For detailed usage instructions, see **[MANUAL.md](./MANUAL.md)**.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 + TypeScript 5 |
| Build | Vite 5 |
| Editor | Tiptap 3 (ProseMirror-based) |
| State | Zustand |
| Styling | Tailwind CSS 3 |
| Virtualization | @tanstack/react-virtual |
| PDF | pdfmake (text-based, searchable) |
| Word import | mammoth.js |
| URL sharing | lz-string (compresses a whole document into a `#doc=` URL fragment) |
| Testing | Vitest + React Testing Library + Playwright |

---

## Architecture

### State Management

```
useDocStore (Zustand)          useChatStore (Zustand)
┌──────────────────────┐       ┌──────────────────────┐
│ docState: DocState   │       │ configuredProviders[] │
│   ├─ title           │       │ activeProviderId      │
│   ├─ settings        │       │ messages[]            │
│   └─ content (JSON)  │       │ systemPrompt          │
│ editor: Editor       │       │ temperature           │
│ zoom, currentPage    │       └──────────────────────┘
│ modal open flags     │
│ mruList[]            │
└──────────────────────┘
```

- **`useDocStore`** — global document state, editor instance, modal visibility flags, MRU list
- **`useChatStore`** — chat messages, provider configuration, active provider, model settings

### Editor Architecture

```
PaginatedViewport
  └─ DocumentEditor (single Tiptap instance)
       ├─ Extensions (StarterKit + custom)
       │    ├─ Table + TableHeader + TableCell + TableRow
       │    ├─ TemplateField (custom node)
       │    ├─ PageBreak (custom node)
       │    ├─ FontSize, FontFamily, Color (textStyle)
       │    ├─ BackgroundColor (highlight via textStyle)
       │    ├─ Image, Link, TaskList, BubbleMenu
       │    └─ TextAlign, Underline, CharacterCount
       ├─ BubbleMenu (floating toolbar on selection)
       └─ TableContextMenu (right-click in tables)
```

### Document Sharing

The `CloudStorageModal` opens to a **userland home view** that needs no accounts and no developer-provisioned infrastructure. Cloud providers (Google Drive, OneDrive, S3) remain available under an "Advanced" collapsible.

| Action | Mode | Mechanism |
|--------|------|-----------|
| Copy Link | save | `shareUrl.ts` — compresses the document into a self-contained `#doc=` URL fragment via `lz-string` |
| Share File | save | `webShare.ts` — native OS share sheet (`navigator.share` with a `.sdjson` file), falls back to download |
| Save to File | save | downloads the document as a `.sdjson` file |
| Open from File | open | reads a `.sdjson` file from disk and loads it into the editor |

A 30 KB size guard (`estimateShareSize` / `canShareViaUrl`) disables Copy Link for oversized documents — they fall back to a file download instead of producing a broken link.

On startup, `App.tsx` hydrates a shared document from a `#doc=` URL fragment and then clears the fragment so a refresh does not re-load it.

### Component Hierarchy

```
App
├─ Navbar (File / Edit / Insert / View / Help menus, title input)
├─ Toolbar (formatting controls, clipboard, alignment, tools)
├─ PageNavigation (prev/next, page jump, cursor pos, stats)
├─ PaginatedViewport (zoom, scroll, page computation)
│    └─ DocumentEditor (Tiptap + BubbleMenu + TableContextMenu)
├─ SearchReplaceModal (find/replace with regex)
├─ PageSetupModal (page format, margins, headers, footers)
├─ TableGridModal (visual 10x10 grid picker)
├─ TableOfContentsModal (TOC preview + insert/replace)
├─ InsertFieldModal (standard + custom template fields)
├─ FieldMergeModal (merge all fields with values)
├─ ImageModal (upload or URL with preview)
├─ LinkModal (URL + display text + validation)
├─ CloudStorageModal (userland sharing + Google Drive, OneDrive, S3)
├─ ChatPanel (LM Studio + Gemini, multi-provider)
├─ ProviderSetupModal (3-step provider wizard)
├─ KeyboardShortcutsModal (shortcut reference)
└─ AboutModal (version, build, commit, related apps)
```

### Custom Tiptap Extensions

| Extension | File | Purpose |
|-----------|------|---------|
| `FontSize` | `src/extensions/FontSize.ts` | Font size attribute on textStyle mark |
| `ParagraphStyle` | `src/extensions/ParagraphStyle.ts` | Line height, indent, paragraph spacing |
| `BackgroundColor` | Built into textStyle | Highlight (replaces old separate Highlight mark) |
| `TemplateField` | `src/extensions/TemplateField.ts` | Inline atomic node for `{{variables}}` |
| `PageBreak` | `src/extensions/PageBreak.ts` | Hard page break node with `Ctrl+Enter` |
| `TableOfContents` | `src/extensions/TableOfContents.ts` | Block node wrapping auto-generated TOC |

### Data Flow

```
User Action → Zustand Action → Editor Command → Tiptap Transaction → View Update
                                                                    ↓
                                                              Auto-save (500ms debounce → localStorage)
```

---

## Build Defines

Vite injects these constants at build time (see `vite.config.ts`):

| Constant | Type | Source |
|----------|------|--------|
| `__APP_VERSION__` | `string` | `package.json` version |
| `__BUILD_TIMESTAMP__` | `string` | `new Date().toISOString()` at build |
| `__GIT_COMMIT_HASH__` | `string` | `git rev-parse --short HEAD` |

Type declarations are in `src/vite-env.d.ts`. Used by `AboutModal` for build info display.

---

## Getting Started (Development)

### Prerequisites
- Node.js 18+
- npm 9+

### Setup

```bash
git clone https://github.com/Code24x7-R/simpledocs.git
cd simpledocs
npm install
npm run dev
```

App runs at `http://localhost:5173` with hot reload.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check (`tsc -b`) + production build |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run all unit tests with coverage (Vitest) |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run type-check` | TypeScript type-check without emit |
| `npm run lint` | ESLint (zero warnings enforced) |

### Full Verification

```bash
npm test && npm run lint && npm run type-check && npm run build
```

---

## Testing

### Unit Tests (Vitest)

Tests are colocated with source files (`*.test.ts`, `*.test.tsx`). Coverage targets:

| Metric | Target |
|--------|--------|
| Line coverage | ≥ 95% |
| Branch coverage | ≥ 85% |
| Lint errors | 0 |
| Type errors | 0 |

### E2E Tests (Playwright)

Located in `tests/e2e/`:
- `editor.spec.ts` — core editing flows
- `keyboard-navigation.spec.ts` — keyboard shortcuts and page navigation
- `merge-focus.spec.ts` — modal focus and selection restore

### Running Specific Tests

```bash
npx jest path/to/file.test.ts          # single file
npx jest --testPathPattern=extension   # pattern match
```

---

## Project Structure

```
simpledocs/
├── docs/
│   ├── BUGFIX.md                    # Bug fix log
│   ├── PLAN.md                      # Project roadmap (33 phases)
│   ├── PROGRESS_LOG.md              # Development progress
│   ├── requirements.md              # Functional specification
│   ├── wysiwyg-pagination.md        # Pagination design doc
│   └── single-editor-constraints.md # Single-editor architecture reference
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── editor/                  # Editor components
│   │   │   ├── PaginatedViewport.tsx    # Zoom + scroll + page computation
│   │   │   ├── DocumentEditor.tsx       # Tiptap instance + context menus
│   │   │   ├── BubbleMenu.tsx           # Floating toolbar on selection
│   │   │   ├── TableContextMenu.tsx     # Right-click table operations
│   │   │   ├── PageNavigation.tsx       # Page controls + cursor stats
│   │   │   ├── PaginationContext.tsx    # Page geometry provider
│   │   │   └── nodes/                   # Custom node views
│   │   │       ├── TemplateFieldView.tsx
│   │   │       └── PageBreakView.tsx
│   │   └── layout/                  # UI shell
│   │       ├── Navbar.tsx               # Menubar + title input
│   │       ├── Toolbar/Toolbar.tsx      # Formatting controls
│   │       ├── SearchReplaceModal.tsx
│   │       ├── PageSetupModal.tsx
│   │       ├── TableGridModal.tsx
│   │       ├── TableOfContentsModal.tsx
│   │       ├── InsertFieldModal.tsx
│   │       ├── FieldMergeModal.tsx
│   │       ├── ImageModal.tsx
│   │       ├── LinkModal.tsx
│   │       ├── CloudStorageModal.tsx
│   │       ├── S3ConfigModal.tsx
│   │       ├── ChatPanel.tsx
│   │       ├── ProviderSetupModal.tsx
│   │       ├── KeyboardShortcutsModal.tsx
│   │       └── AboutModal.tsx
│   ├── constants.ts                 # Shared color palettes
│   ├── hooks/                       # Shared hooks
│   │   └── useEditorClipboard.ts        # Consolidated copy/cut/paste
│   ├── extensions/                  # Custom Tiptap extensions
│   │   ├── index.ts                     # Extension registry
│   │   ├── FontSize.ts
│   │   ├── TemplateField.ts
│   │   └── PageBreak.ts
│   ├── store/                       # Zustand stores
│   │   ├── useDocStore.ts              # Document state + modals
│   │   └── useChatStore.ts             # Chat state + providers
│   ├── types/                       # TypeScript interfaces
│   │   ├── page.ts
│   │   ├── provider.ts
│   │   ├── chat.ts
│   │   └── promptTemplate.ts
│   ├── utils/                       # Helpers
│   │   ├── fileIO.ts                   # JSON save/load, Markdown export
│   │   ├── pdfExport.ts                # PDF generation via html2pdf.js
│   │   ├── clipboard.ts                # Copy/paste with HTML fallback
│   │   ├── wordImport.ts               # DOCX → Tiptap via mammoth.js
│   │   ├── search.ts                   # Find/replace engine
│   │   ├── templateFields.ts           # Field extraction + merge
│   │   ├── pagination.ts               # Page geometry calculations
│   │   ├── unitConversion.ts           # mm/pt/px/in conversions
│   │   ├── mru.ts                      # Most Recently Used file list
│   │   ├── textStats.ts                # Word/char count, reading time
│   │   ├── htmlToMarkdown.ts           # Export conversion
│   │   ├── markdownToHtml.ts           # Import conversion
│   │   └── providers/                  # LLM provider adapters
│   │       ├── lmStudioProvider.ts
│   │       ├── geminiProvider.ts
│   │       └── providerRegistry.ts
│   ├── App.tsx                      # Root component, wires all modals
│   ├── main.tsx                     # Entry point
│   ├── index.css                    # Global styles + Tailwind
│   └── vite-env.d.ts                # Build define types
├── tests/e2e/                       # Playwright E2E tests
│   ├── editor.spec.ts
│   ├── keyboard-navigation.spec.ts
│   └── merge-focus.spec.ts
├── .github/workflows/deploy.yml     # CI/CD → GitHub Pages
├── AGENTS.md                        # AI-assisted development guide
├── MANUAL.md                        # End-user documentation
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Deployment

### GitHub Pages (Automatic)

GitHub Actions workflow (`.github/workflows/deploy.yml`) auto-deploys on push to `main`.

Setup: Repo Settings → Pages → Source: "GitHub Actions"

### Manual

```bash
npm run build
# Deploy dist/ to any static host
```

---

## AI-Assisted Development

This project includes an `AGENTS.md` file with guidelines for AI coding assistants (e.g., pi, Cursor, Claude Cover). It defines:

- Development tracks (feature work vs bugfix work)
- Testing conventions and coverage targets
- Common pitfalls (virtualizer mocks, stale closures, modal focus)
- Quality gates (lint + type-check + build before completion)

---

## Contributing

1. Pick a task from `docs/PLAN.md` (Features) or `docs/BUGFIX.md` (Bugs)
2. Write tests first targeting uncovered branches
3. Implement the feature/fix
4. Run full verification: `npm test && npm run lint && npm run type-check && npm run build`
5. Update task status and coverage stats in `docs/PLAN.md`
6. Log completion in `docs/PROGRESS_LOG.md`

---

## License

MIT

---

## Related Apps

- [SimpleSheet](https://simplesheets.mouseclick.au) — Spreadsheet web app from the same author
- [Simple Web Apps](https://sites.google.com/view/simplewebapps/home) — Project homepage
