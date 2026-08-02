# simpledocs — Bug Tracker

## Active Bugs

*No active bugs.*

## Fixed Bugs

| ID | Title | Date | Description | Fix |
|----|-------|------|-------------|-----|
| B-013 | Editor not accepting keystrokes | 2026-08-02 | Clicking in editor and typing had no effect. Keystrokes were intercepted by PageBackground overlay. | Removed `pointer-events-auto` div inside `pointer-events-none` overlay in PageBackground.tsx. The inner div was creating an invisible shield over the Tiptap contenteditable area. |
| B-014 | Editor content hidden behind page backgrounds | 2026-08-02 | Even after fixing pointer-events, editor text was invisible because absolutely-positioned white page backgrounds painted on top of the editor. | Reordered rendering in PaginatedViewport.tsx: backgrounds render first (behind), editor renders after with `z-index: 1`. |
| B-015 | Search & Replace scroll-to-match not working | 2026-08-02 | SearchReplaceModal queried `getElementById('paginated-viewport')` for scrolling to matches, but the ID was missing from the viewport div. | Added `id="paginated-viewport"` to the scrollable container div in PaginatedViewport.tsx. |
| B-016 | Page navigation next/prev bounces back | 2026-08-02 | Clicking next page navigated briefly then immediately bounced back to the previous page. | Race condition: `isNavigatingRef` was reset after a fixed 400ms timeout, but smooth scrolling a full page takes longer. Fixed by using the `scrollend` event (with 1500ms timeout fallback) to reset the flag only when scrolling actually completes. |
| B-017 | Page break doesn't push content to next page | 2026-08-02 | Inserting a page break only showed a small dashed line; text after it stayed on the same visual page. | Implemented DocumentLayoutEngine following the standard two-phase pagination pattern (line wrapping + page allocation). PageBreakView now dynamically calculates spacer height to fill remaining page space, pushing following content to the next page boundary. Files: `DocumentLayoutEngine.ts`, `pagination.ts`, `usePagination.ts`, updated `PageBreakView.tsx`. |
| B-010 | Content overflow causes scrollbars instead of auto page break | 2026-08-02 | When pasting content larger than a page, scrollbars appear inside the pageview. Content should flow over page breaks automatically up to the length. | Added page overflow calculation utility. PaginatedViewport now measures content height and renders multiple page canvases when content exceeds available height. |

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
