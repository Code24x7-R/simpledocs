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

## Future Enhancements (Not Yet Planned)

- [ ] Multi-page content splitting (automatic overflow to next page)
- [ ] Table cell operations (add/delete rows/columns, merge/split)
- [ ] Table formatting (border thickness, cell background color)
- [ ] Custom margins in inches (currently only mm display)
- [ ] Drag-and-drop JSON import (currently file input only)
- [ ] Print-optimized CSS (@media print styles)
- [ ] Fit-to-width zoom option
- [ ] Find and replace
- [ ] Spell check
- [ ] Collaborative editing
- [ ] Cloud storage integration
