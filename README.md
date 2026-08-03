# simpledocs

A modern, browser-based paginated WYSIWYG document editor with Microsoft Word / Google Docs feature parity. Built with React, TypeScript, and Tiptap.

**Live demo:** [https://Code24x7-R.github.io/simpledocs/](https://Code24x7-R.github.io/simpledocs/)

### Tech Stack
- TypeScript
- Tiptap

## Features

### Rich Text Editing
- **Text Formatting** — Bold, Italic, Underline, Strikethrough
- **Colors** — Text color and highlight color with full color picker
- **Typography** — Font family and font size selection
- **Alignment** — Left, Center, Right, Justify

### Structure & Styles
- **Headings** — Normal, Heading 1, Heading 2, Heading 3
- **Lists** — Bullet list, Numbered list, Task list (with checkboxes)
- **Blocks** — Blockquote, Code block, Horizontal rule

### Tables
- **Grid Picker** — Insert tables up to 10×10 via visual grid
- **Header Row** — Automatic header row on creation
- **Resizable Columns** — Drag to resize columns

### Template Fields
- **Inline Variables** — Insert `{{field_name}}` badges that are non-editable atomic nodes
- **Standard Fields** — `{{current_date}}`, `{{document_title}}`, `{{page_number}}`, `{{total_pages}}`
- **Custom Fields** — Define your own variable names

### Pagination & Layout
- **Page Formats** — A4 (210×297mm) and Letter (8.5×11in)
- **Orientation** — Portrait and Landscape
- **Margins** — Fully configurable top/bottom/left/right margins
- **Headers & Footers** — Editable header content, automatic page numbering ("Page X of Y")
- **True Paginated Model** — Each page is an independent editor with its own caret and selection
- **Cross-Page Navigation** — Arrow keys, PgUp/PgDn move caret between pages
- **Auto Overflow** — Content automatically flows to next page when page is full
- **Smart Merge** — Backspace at start of page merges into previous page

### File Operations
- **JSON Export** — Download your document as a `.json` file
- **JSON Import** — Open any previously saved `.json` document
- **PDF Export** — Generate PDF via html2pdf.js with exact margin matching
- **Print** — Native browser print support

### Persistence
- **Auto-Save** — Automatic localStorage save with 500ms debounce
- **Restore on Load** — Your document reopens exactly as you left it
- **Named Documents** — Create new documents anytime

### View Controls
- **Zoom** — 75%, 100%, 125% zoom levels
- **Virtualized Rendering** — Smooth scrolling via @tanstack/react-virtual

---

## Installation

### Prerequisites
- Node.js 18+ 
- npm 9+

### Setup

```bash
# Clone the repository
git clone https://github.com/Code24x7-R/simpledocs.git
cd simpledocs

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with hot reload |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run type-check` | TypeScript type-check without emit |
| `npm run lint` | ESLint check |

---

## Deployment

### GitHub Pages (Automatic)

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically deploys to GitHub Pages on every push to `main`.

**Setup:**
1. Go to your repo's Settings → Pages
2. Set "Source" to "GitHub Actions"
3. Push to `main` — the workflow builds and deploys automatically

The app will be available at `https://Code24x7-R.github.io/simpledocs/`

### Manual Deployment

```bash
# Build for production
npm run build

# The `dist/` folder contains the static site
# Deploy `dist/` to any static hosting provider
```

---

## Dependencies

### Core
| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^18.3 | UI framework |
| `react-dom` | ^18.3 | DOM rendering |
| `typescript` | ^5.4 | Type safety |
| `vite` | ^5.2 | Build tool & dev server |

### Editor
| Package | Version | Purpose |
|---------|---------|---------|
| `@tiptap/react` | ^3.x | React bindings for Tiptap |
| `@tiptap/starter-kit` | ^3.x | Core editor extensions |
| `@tiptap/extension-table` | ^3.x | Table support |
| `@tiptap/extension-underline` | ^3.x | Underline formatting |
| `@tiptap/extension-text-style` | ^3.x | Font family/size/color |
| `@tiptap/extension-highlight` | ^3.x | Text highlighting |
| `@tiptap/extension-text-align` | ^3.x | Paragraph alignment |
| `@tiptap/extension-task-list` | ^3.x | Task/check lists |

### State & UI
| Package | Version | Purpose |
|---------|---------|---------|
| `zustand` | ^4.5 | State management |
| `tailwindcss` | ^3.4 | Utility-first CSS |
| `lucide-react` | ^0.378 | Icons |
| `@tanstack/react-virtual` | ^3.5 | Viewport virtualization |
| `html2pdf.js` | ^0.10 | PDF export |
| `clsx` | ^2.1 | Conditional classnames |
| `tailwind-merge` | ^2.3 | Tailwind class merging |

### Testing
| Package | Version | Purpose |
|---------|---------|---------|
| `vitest` | ^1.6 | Unit testing |
| `@testing-library/react` | ^15 | Component testing |
| `@playwright/test` | ^1.44 | E2E testing |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + B` | Bold |
| `Ctrl + I` | Italic |
| `Ctrl + U` | Underline |
| `Ctrl + Z` | Undo |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Redo |
| `Ctrl + Enter` | Insert page break |
| `Ctrl + S` | Save (browser default) |
| `Ctrl + P` | Print |
| `Ctrl + A` | Select all |
| `Ctrl + C` | Copy |
| `Ctrl + V` | Paste |
| `Ctrl + X` | Cut |

---

## Tips & Hints

- **Auto-save is automatic** — Your work saves to localStorage every 500ms. No need to manually save for browser persistence.
- **JSON files are portable** — Export a JSON file to back up your work or transfer between devices.
- **PDF export matches your page settings** — Margins, format, and orientation in the PDF match your Page Setup configuration.
- **Template fields are non-editing** — Once inserted, template field badges can't be accidentally typed into. Click the × to remove them.
- **Tables auto-include headers** — New tables come with a header row by default. Right-click table cells for more operations.
- **Page breaks persist** — Manual page breaks are saved in your document and will restore on reload.
- **Use zoom for overview** — Drop to 75% zoom to see the full page layout, or 125% for detail work.

---

## Project Structure

```
simpledocs/
├── docs/
│   ├── requirements.md          # Functional specification
│   ├── wysiwyg-pagination.md    # Pagination design doc
│   └── BUGFIX.md                # Bug fix log
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── editor/              # Editor components
│   │   │   ├── MultiPageEditor.tsx   # Renders N page editors
│   │   │   ├── PageEditor.tsx       # Single page editor
│   │   │   ├── PaginatedViewport.tsx # Vertical page stack
│   │   │   ├── PaginationContext.tsx # Per-page geometry
│   │   │   └── nodes/               # Custom node views
│   │   ├── layout/              # UI shell components
│   │   │   ├── Navbar.tsx
│   │   │   ├── Toolbar/
│   │   │   ├── PageSetupModal.tsx
│   │   │   ├── TableGridModal.tsx
│   │   │   └── InsertFieldModal.tsx
│   │   └── ui/                  # Reusable primitives
│   ├── extensions/              # Tiptap extensions
│   │   ├── TemplateField.ts
│   │   ├── PageBreak.ts
│   │   └── index.ts
│   ├── store/                   # Zustand store
│   │   └── useDocStore.ts
│   ├── types/                   # TypeScript types
│   │   └── page.ts
│   ├── utils/                   # Helpers
│   │   ├── unitConversion.ts
│   │   ├── fileIO.ts
│   │   ├── pdfExport.ts
│   │   └── pageOverflow.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── tests/e2e/                   # Playwright E2E tests
│   ├── editor.spec.ts
│   ├── keyboard-navigation.spec.ts
│   └── merge-focus.spec.ts
├── .github/workflows/deploy.yml # GitHub Pages deploy
├── PLAN.md                      # Project roadmap
└── README.md
```
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## License

MIT
