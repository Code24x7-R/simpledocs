# Functional Specification: Paginated WYSIWYG Document Processor (simpledocs)

Document Version: 2.0.0
Target Execution Agent: Autonomous LLM Coding Agent (Devin, Claude Code, Cursor Agent, etc.)
Project Name: simpledocs
Deployment Target: GitHub Pages (https://<username>.github.io/simpledocs/)

## 1. System Overview & Objective

The goal of this project is to build simpledocs, a modern, high-performance, browser-based paginated document editor with Microsoft Word / Google Docs feature parity. The editor uses a **single Tiptap editor instance** for the entire document, with pages rendered as visual guides (the "Google Docs method"). This eliminates multi-editor sync issues and content redistribution complexity.

## 2. Technical Stack Definition

- **App Name:** simpledocs
- **Build & Dev Tooling:** Vite 5 + TypeScript (Strict Mode)
- **UI Framework:** React 18
- **Styling & Layout:** Tailwind CSS + lucide-react for icons
- **Core Editor Engine:** Tiptap v2/v3 Core (@tiptap/react, @tiptap/pm, @tiptap/starter-kit)
- **Pagination:** CSS-driven page visualization (single continuous document, pages as visual overlays)
- **Viewport Virtualization:** @tanstack/react-virtual
- **Export Engine:** html2pdf.js (for client-side PDF rendering) + Native JSON export/import
- **Deployment:** GitHub Pages (gh-pages branch or GitHub Actions workflow)
- **Testing:** Vitest (Unit/Integration) + Playwright (E2E)

## 3. Architecture & Data State Model

### 3.1 Document State Schema (DocState)

All document metadata and content serialize to/from the following JSON schema:

```json
{
  "id": "doc_uuid_12345",
  "title": "Untitled Document",
  "createdAt": "2026-08-02T11:00:00Z",
  "updatedAt": "2026-08-02T11:00:00Z",
  "totalPages": 3,
  "settings": {
    "pageFormat": "A4",
    "orientation": "portrait",
    "margins": {
      "top": "20mm",
      "bottom": "20mm",
      "left": "25mm",
      "right": "25mm"
    },
    "header": {
      "enabled": true,
      "content": "simpledocs - Document Title Header"
    },
    "footer": {
      "enabled": true,
      "showPageNumbers": true
    },
    "pageGap": 24,
    "showPageBackgrounds": true
  },
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "Welcome to simpledocs!" }
        ]
      }
    ]
  }
}
```

### 3.2 Single-Editor Architecture

**Key principle:** One Tiptap editor instance manages the entire document. Pages are visual overlays computed from `contentHeight / pageHeight`. This eliminates:

- Multi-editor sync issues
- Content redistribution loops
- Cross-page cursor management
- Per-page state duplication

**Migration:** Old documents with `pages[]` format are automatically migrated to single `content` on load via `migrateToContent()`.

### 3.3 State Management Rules

- **Unidirectional Flow:** The editor state updates the Zustand store on every transaction (`editor.on('update')`).
- **Local Persistence:** Auto-save state to localStorage under `SIMPLEDOCS_STATE` with a 500ms debounce.
- **UI Synchronization:** Toolbar action states reactively update using Tiptap editor hooks.

## 4. Functional Requirements

### FR-1: Navigation Bar & Document Settings

- **Navbar Branding:** Display simpledocs logo/wordmark in top-left.
- **Navbar Controls:** Document title input (editable), File menu (New, Open JSON, Save JSON, Export PDF, Print), Undo/Redo triggers, Zoom controls (75%, 100%, 125%, Fit).
- **Page Setup Modal:** Allow toggling Page Size (A4, Letter), Orientation (Portrait, Landscape), and Custom Margins (top, bottom, left, right in mm or inches).

### FR-2: Rich Text Toolbar

- **Text Formatting:** Bold, Italic, Underline, Strike, Text Color, Highlight Color, Font Family, Font Size.
- **Paragraph Alignment:** Left, Center, Right, Justify.
- **Lists & Blocks:** Bullet List, Numbered List, Task List, Blockquote, Code Block, Horizontal Rule.
- **Styles Dropdown:** Normal, Heading 1, Heading 2, Heading 3, Subtitle.

### FR-3: Paginated Page Rendering & Layout

- **Page Canvas:** Render A4 visual containers (210mm x 297mm at 96 DPI scale) with drop shadows against a neutral grey canvas background (#f3f4f6).
- **Headers & Footers:** Active editable region at the top and bottom of each page canvas. Dynamic placeholders `{page}` and `{total}` resolve to current page index and total page count.
- **Page Breaks:** Manual page break insertion (Ctrl+Enter or toolbar action) forces content into a new page via CSS `break-after: page`. No content redistribution needed.

### FR-4: Tables Support

- **Table Creation:** Grid picker modal (up to 10x10) to insert dynamic tables.
- **Cell Operations:** Add/Delete Row (above/below), Add/Delete Column (left/right), Merge/Split Cells, Toggle Header Row/Column.
- **Table Formatting:** Border thickness, background cell fill color, column resizing handlers.

### FR-5: Template / Variable Placeholder Fields

- **Inline Node Views:** Custom atomic React components representing template variables (e.g., `{{client_name}}`, `{{current_date}}`).
- **Insertion Menu:** Dropdown menu "Insert Field" allowing insertion of standard and custom template tags.
- **Behavior:** Non-editable inline badges that highlight on hover and allow bulk replacement or state value bindings.

### FR-6: File Serialization & PDF Export

- **JSON Import/Export:** Export document schema as `.json` download; drop/upload `.json` file to hydrate editor state.
- **PDF Export:** Convert DOM page elements into PDF pages using html2pdf.js with exact mm margin matching and CSS page breaks.

## 5. UI Layout & Component Hierarchy

```
src/
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx             # File operations & Title
│   │   ├── Toolbar/               # Formatting controls & dropdowns
│   │   ├── PageSetupModal.tsx     # Margin, Size, Orientation options
│   │   ├── SearchReplaceModal.tsx # Single-editor search/replace
│   │   └── FieldMergeModal.tsx    # Template field merge dialog
│   ├── editor/
│   │   ├── DocumentEditor.tsx     # Single Tiptap instance for entire document
│   │   ├── PaginatedViewport.tsx  # Visual page overlays at fixed intervals
│   │   ├── PaginationContext.tsx  # Geometry + page count from content height
│   │   ├── PageNavigation.tsx     # Prev/next/current page controls
│   │   └── nodes/                 # Custom Node Views (PageBreak, TemplateField)
│   └── ui/                        # Reusable Radix / Tailwind UI primitives
├── extensions/                    # Custom Tiptap extensions (PageBreak, TemplateField, FontSize)
├── store/                         # Zustand state manager for DocState
├── utils/                         # PDF export, unit conversion, template fields, search
└── App.tsx
```

## 6. Verification & Test Suite Requirements

### 6.1 Unit Tests (vitest)

- **JSON Serialization Test:** Verify editor.getJSON() output matches DocState schema structure.
- **State Store Test:** Verify updating page margins triggers UI re-render and state update.
- **Template Node Test:** Assert insertion of a template node inserts an atomic non-text-editable inline node.
- **Pagination Test:** Verify geometry calculations and text extraction from single content tree.
- **Migration Test:** Verify old `pages[]` format migrates to single `content` correctly.

### 6.2 E2E Integration Tests (playwright)

- **Formatting Flow:** Load editor, select text, click Bold, assert node has `<strong>` mark or bold styling.
- **Table Creation Flow:** Click Table → 3x3 → Verify `<table>` element rendered in DOM with 3 `<tr>` elements.
- **JSON Import Flow:** Drag/drop a valid document.json file → Assert editor populates with correct title and body text.
- **PDF Generation Trigger:** Click "Export PDF" → Verify html2pdf.js execution trigger without throwing JS runtime errors.

## 7. Key Architectural Decisions (v2.0)

| Decision | Rationale |
|----------|-----------|
| Single Tiptap instance | Eliminates multi-editor sync, content redistribution, and cursor management complexity |
| CSS page breaks (`break-after: page`) | Native browser support for print/PDF pagination without content splitting |
| Pages as visual overlays | Content flows naturally; page count computed from `contentHeight / pageHeight` |
| `migrateToContent()` for old format | Backward compatibility for documents saved with old `pages[]` format |
| No DocumentLayoutEngine | Removed complex AST-based pagination in favor of CSS-driven approach |

## 8. Execution Commands

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Run unit tests
npm run test

# Type check
npm run type-check

# Lint
npm run lint

# Build production bundle
npm run build

# Deploy to GitHub Pages
npm run deploy
```
