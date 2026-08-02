# simpledocs — Bug Tracker

## Active Bugs

_No active bugs._

---

## Fixed Bugs

| ID | Title | Date | Description | Fix |
|----|-------|------|-------------|-----|
| B-001 | TS2339: setFontFamily/setFontSize not in StarterKit | 2026-08-02 | StarterKit doesn't include TextStyle/FontFamily extensions | Installed @tiptap/extension-text-style, @tiptap/extension-font-family, @tiptap/extension-color |
| B-002 | TS2339: toggleTaskList not in ChainedCommands | 2026-08-02 | Tiptap 3.x renamed toggleTaskList to toggleList | Changed to `toggleList('taskList', 'taskItem')` |
| B-003 | Rollup: getStyleProperty not exported by @tiptap/core | 2026-08-02 | extension-text-style v3 incompatible with @tiptap/core v2 | Upgraded all Tiptap packages to v3 consistently |
| B-004 | Rollup: Cannot resolve @tiptap/extension-list | 2026-08-02 | extension-task-list v3 depends on extension-list (peer) | Installed @tiptap/extension-list |
| B-005 | TS2345: setContent second arg type mismatch | 2026-08-02 | v3 SetContentOptions replaced boolean | Changed `setContent(content, false)` to `setContent(content, { emitUpdate: false })` |
| B-006 | ReferenceError: jest is not defined in tests | 2026-08-02 | Used jest global in vitest environment | Changed `jest.fn()` to `vi.fn()` and imported from vitest |
| B-007 | Error: createObjectURL does not exist | 2026-08-02 | jsdom doesn't implement URL.createObjectURL | Used `vi.stubGlobal('URL', {...})` in tests |
| B-008 | TypeError: appendChild parameter not Node | 2026-08-02 | Mock anchor object isn't a real DOM Node | Mocked document.body.appendChild/removeChild |
| B-009 | TS2684: this context type mismatch in extension tests | 2026-08-02 | addAttributes this type too strict | Used proper cast and explicit this context |

---

## Known Limitations

| ID | Description | Severity | Workaround |
|----|-------------|----------|------------|
| L-001 | Multi-page content splitting not implemented (single virtualized page) | Medium | Content scrolls within one long canvas; page breaks create visual breaks only |
| L-002 | Table cell operations (add/delete rows/columns, merge/split) not in toolbar | Low | Users can use Tiptap's native table resize handles |
| L-003 | No drag-and-drop JSON import (file input only) | Low | File picker works reliably across browsers |
| L-004 | No @media print styles (print output may include UI) | Low | Use Export PDF for clean output |
| L-005 | Fit-to-width zoom not implemented | Low | 75%/100%/125% cover most use cases |
| L-006 | E2E tests require Playwright browser install | Medium | Run `npx playwright install chromium` to enable |
