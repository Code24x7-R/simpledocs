# Functional Specification: Paginated WYSIWYG Document Processor (simpledocs)
Document Version: 1.1.0
Target Execution Agent: Autonomous LLM Coding Agent (Devin, Claude Code, Cursor Agent, etc.)
Project Name: simpledocs
Deployment Target: GitHub Pages (https://<username>.github.io/simpledocs/)

## 1. System Overview & Objective
The goal of this project is to build simpledocs, a modern, high-performance, browser-based paginated document editor with Microsoft Word / Google Docs feature parity. The editor must render content on fixed-size paginated canvases (A4/Letter), support headers/footers, margins, tables, dynamic template fields, persist native document state as clean JSON, and deploy cleanly to GitHub Pages via GitHub Actions.

## 2. Technical Stack Definition
App Name: simpledocs
Build & Dev Tooling: Vite 5 + TypeScript (Strict Mode)
UI Framework: React 18
Styling & Layout: Tailwind CSS + @radix-ui/react-* or lucide-react for icons
Core Editor Engine: Tiptap v2/v3 Core (@tiptap/react, @tiptap/pm, @tiptap/starter-kit)
Pagination & Pages Extension: Custom Paginated Nodes or Tiptap Pages Extension (@tiptap-pro/extension-pages / custom ProseMirror Viewport)
Viewport Virtualization: @tanstack/react-virtual
Export Engine: html2pdf.js (for client-side PDF rendering) + Native JSON export/import
Deployment: GitHub Pages (gh-pages branch or GitHub Actions workflow)
Testing: Vitest (Unit/Integration) + Playwright (E2E)

## 3. Architecture & Data State Model
3.1 Document State Schema (DocState)
All document metadata and content must serialize to/from the following JSON schema:

```

JSON
{
  "id": "doc_uuid_12345",
  "title": "Untitled Document",
  "createdAt": "2026-08-02T11:00:00Z",
  "updatedAt": "2026-08-02T11:00:00Z",
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
    }
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
## 3.2 State Management Rules
Unidirectional Flow: The editor state must update an internal React state / Zustand store on every transaction (editor.on('update')).
Local Persistence: Automatically auto-save state to localStorage under SIMPLEDOCS_STATE with a 500ms debounce.
UI Synchronization: Toolbar action states (e.g., isBold, activeHeadingLevel) must reactively update using Tiptap editor hooks.

## 4. Functional Requirements
FR-1: Navigation Bar & Document Settings
Navbar Branding: Display simpledocs logo/wordmark in top-left.
Navbar Controls: Document title input (editable), File menu (New, Open JSON, Save JSON, Export PDF, Print), Undo/Redo triggers, Zoom controls (75%, 100%, 125%, Fit).
Page Setup Modal: Allow toggling Page Size (A4, Letter), Orientation (Portrait, Landscape), and Custom Margins (top, bottom, left, right in mm or inches).

FR-2: Rich Text Toolbar
Text Formatting: Bold, Italic, Underline, Strike, Text Color, Highlight Color, Font Family, Font Size.
Paragraph Alignment: Left, Center, Right, Justify.
Lists & Blocks: Bullet List, Numbered List, Task List, Blockquote, Code Block, Horizontal Rule.
Styles Dropdown: Normal, Heading 1, Heading 2, Heading 3, Subtitle.

FR-3: Paginated Page Rendering & Layout
Page Canvas: Render individual A4 visual containers (210mm x 297mm at 96 DPI scale) with drop shadows against a neutral grey canvas background (#f3f4f6).
Headers & Footers: Active editable region at the top and bottom of each page canvas. Dynamic placeholders {page} and {total} must resolve to current page index and total page count.
Page Breaks: Manual page break insertion (Ctrl+Enter or toolbar action) forces content into a new page node. Automatic overflow calculation splits long text streams.

FR-4: Tables Support
Table Creation: Grid picker modal (up to 10x10) to insert dynamic tables.
Cell Operations: Add/Delete Row (above/below), Add/Delete Column (left/right), Merge/Split Cells, Toggle Header Row/Column.
Table Formatting: Border thickness, background cell fill color, column resizing handlers.

FR-5: Template / Variable Placeholder Fields
Inline Node Views: Custom atomic React components representing template variables (e.g., {{client_name}}, {{current_date}}).
Insertion Menu: Dropdown menu "Insert Field" allowing insertion of standard and custom template tags.
Behavior: Non-editable inline badges that highlight on hover and allow bulk replacement or state value bindings.

FR-6: File Serialization & PDF Export
JSON Import/Export: Export document schema as .json download; drop/upload .json file to hydrate editor state.
PDF Export: Convert DOM page elements into PDF pages using html2pdf.js with exact mm margin matching and pagination breaking.

## 5. UI Layout & Component Hierarchy

```
PLAINTEXT
src/
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx             # File operations & Title
│   │   ├── Toolbar/               # Formatting controls & dropdowns
│   │   └── PageSetupModal.tsx     # Margin, Size, Orientation options
│   ├── editor/
│   │   ├── DocumentEditor.tsx     # Tiptap Editor Context Provider
│   │   ├── PaginatedViewport.tsx  # Virtualized page container (@tanstack)
│   │   ├── PageCanvas.tsx         # Individual Page Wrapper (A4 bounds)
│   │   ├── HeaderFooter.tsx       # Header & Footer inline slots
│   │   └── nodes/                 # Custom Node Views (TemplateFields, Tables)
│   └── ui/                        # Reusable Radix / Tailwind UI primitives
├── extensions/                    # Custom Tiptap extensions (PageBreak, Fields)
├── store/                         # Zustand state manager for DocState
├── utils/                         # Export PDF helper, unit converter (mm to px)
└── App.tsx
```
## 6. Verification & Test Suite Requirements
The LLM agent must write and execute the following test suites before completing the build:
### 6.1 Unit Tests (vitest)
JSON Serialization Test: Verify editor.getJSON() output matches DocState schema structure.
State Store Test: Verify updating page margins triggers UI re-render and state update.
Template Node Test: Assert insertion of a template node inserts an atomic non-text-editable inline node.

### 6.2 E2E Integration Tests (playwright)

Formatting Flow: Load editor, select text, click Bold, assert node has <strong> mark or bold styling.
Table Creation Flow: Click Table → 3x3 → Verify <table> element rendered in DOM with 3 <tr> elements.
JSON Import Flow: Drag/drop a valid document.json file → Assert editor populates with correct title and body text.
PDF Generation Trigger: Click "Export PDF" → Verify html2pdf.js execution trigger without throwing JS runtime errors.

## 7. Execution Commands for LLM Coding Agent
Execute the following sequential workflow:

### Phase 1: Setup & Dependencies
```
BASH
npm create vite@latest . -- --template react-ts
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header
npm install @tanstack/react-virtual lucide-react clsx tailwindmerge zustand html2pdf.js
npm install -D tailwindcss postcss autoprefixer vitest @playwright/test
npx tailwindcss init -p
```
### Phase 2: Implementation Sequence

- Implement DocState store in src/store/useDocStore.ts.
- Construct Tailwind UI shell (Navbar, Toolbar) with responsive dropdown menus.
- Build Tiptap instance in DocumentEditor.tsx with core extensions and custom Node Views.
- Implement PageCanvas.tsx with fixed A4 dimensions (210mm x 297mm), margins, and header/footer slots.
- Wire virtualization using @tanstack/react-virtual to map page array to scroll height.
- Connect html2pdf.js export trigger in src/utils/pdfExport.ts.

### Phase 3: QA, Verification & Deployment

Run Unit Tests: npm run test
Run E2E Tests: npx playwright test
Build Production Bundle: npm run build
Deploy to GitHub
