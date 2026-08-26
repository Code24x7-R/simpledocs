# Cell Resize & Autofit — TDD Plan (Occam's Razor)

**Goal:** Click-and-drag a table cell border to resize its column; double-click a border to autofit that column to its widest text content (+ padding).

**Principle:** Tiptap's built-in `columnResizing` plugin (active via `resizable: true`) already does ~90% of the work — it renders `.column-resize-handle` DOM elements on hover, handles all drag mechanics, and dispatches `colwidth` transactions. **We only add what's missing: (1) visible handles via CSS, (2) double-click-to-autofit via one small extension.**

**Status:** 41 phases complete (1012 tests). This is Phase 42.

---

## 1. Current State — What Already Exists

| Aspect | Built-in behavior | Missing |
|--------|-------------------|---------|
| Drag-to-resize | ✅ `columnResizing` plugin — mousedown/mousemove/mouseup, min-width clamp, `colwidth` transaction | — |
| Handle DOM elements | ✅ `handleDecorations()` renders `<div class="column-resize-handle">` on hover at column edges | — |
| Hit-testing | ✅ `handleMouseMove` detects cursor within 5px of left/right cell edge | — |
| Cursor feedback | ✅ Applies `resize-cursor` class when hovering a handle | — |
| **Visible handles** | ❌ Handles exist in DOM but are **unstyled** (invisible) | **CSS** |
| **Double-click autofit** | ❌ No autofit behavior | **Small extension** |

### Verified: handles are already in the DOM

```js
// prosemirror-tables columnResizing plugin — already active
props: {
  decorations: (state) => {
    const pluginState = columnResizingPluginKey.getState(state);
    if (pluginState && pluginState.activeHandle > -1)
      return handleDecorations(state, pluginState.activeHandle);  // ← renders .column-resize-handle divs
  },
  handleDOMEvents: {
    mousemove: handleMouseMove,   // hit-testing
    mouseleave: handleMouseLeave,
    mousedown: handleMouseDown,   // drag start
  }
}
```

`handleDecorations` creates `Decoration.widget(pos, dom)` with `dom.className = "column-resize-handle"` at the right edge of each cell in the target column. **These elements are already positioned by ProseMirror at the cell's right edge** — they just need CSS to be seen.

---

## 2. Files (minimal)

| File | Action | Purpose |
|------|--------|---------|
| `src/index.css` | **EDIT** | Make `.column-resize-handle` visible (vertical bar, hover highlight) |
| `src/extensions/TableAutofit.ts` | **NEW** | Small extension: `dblclick` handler → measure column → set `colwidth` |
| `src/extensions/TableAutofit.test.ts` | **NEW** | Tests for autofit logic |
| `src/extensions/index.ts` | **EDIT** | Add `TableAutofit` to extension list |
| `docs/PLAN.md` | **EDIT** | Add Phase 42 entry |

**No changes to:** `Table` config (keep `resizable: true`), store, DocumentEditor, or any drag logic.

---

## 3. Test-First Development Phases

### Phase 42a: Autofit measurement (pure logic)

**Write tests first** → `src/extensions/TableAutofit.test.ts` (section: "measurement")

| Test | What it verifies |
|------|------------------|
| `measureTextWidth returns canvas width for non-empty text` | Calls `canvas.measureText`, returns its value |
| `measureTextWidth returns 0 for empty/whitespace text` | Guards against empty |
| `measureColumnContentWidth returns max cell width + padding` | Given a table DOM with 2 cells (stubbed widths 80, 120) → returns `120 + PADDING` |
| `measureColumnContentWidth handles empty cells` | Empty cell contributes 0, not error |
| `AUTOFIT_PADDING is applied` | Confirms padding constant is added |

**Then implement** `measureTextWidth` + `measureColumnContentWidth` in `TableAutofit.ts`.

### Phase 42b: Autofit transaction (ProseMirror integration)

**Write tests first** (section: "autofit transaction")

| Test | What it verifies |
|------|------------------|
| `autofitColumn dispatches colwidth update` | Given editor with 3-col table (colwidth=null), dblclick border → transaction sets colwidth on all cells in that column |
| `autofitColumn measures and applies max width + padding` | Stubbed measurement returns 150 → colwidth set to `150 + PADDING` |
| `autofitColumn respects min width` | Measured width below `MIN_COLUMN_WIDTH` → clamps to min |
| `autofitColumn is no-op outside handle zone` | Click in cell middle → no transaction dispatched |

**Then implement** `autofitColumn(view, event, measureFn)`.

### Phase 42c: Double-click handler + integration

**Write tests first** (section: "dblclick handler + integration")

| Test | What it verifies |
|------|------------------|
| `dblclick near column border triggers autofit` | Simulate dblclick within handle zone of a border → autofit dispatched |
| `dblclick in cell middle is ignored` | Simulate dblclick at cell center → no autofit |
| `end-to-end: double-click border autofits column` | Render editor with table, dblclick border → `colwidth` attr changes in document JSON |
| `end-to-end: drag still works (built-in untouched)` | Simulate drag on border → `colwidth` changes (built-in plugin unaffected) |

**Then implement** the `dblclick` handler in the plugin's `handleDOMEvents`.

---

## 4. Implementation Detail

### `TableAutofit.ts` — minimal extension

```ts
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { cellAround, TableMap } from '@tiptap/pm/tables';

export const AUTOFIT_PADDING = 16;     // px added to measured text width
export const MIN_COLUMN_WIDTH = 40;    // px floor
export const HANDLE_ZONE = 6;          // px either side of border (matches built-in ~5px)

// --- Pure functions (Phase 42a) ---
measureTextWidth(text: string, font: string): number
measureColumnContentWidth(tableDom: HTMLElement, colIndex: number, measureFn): number

// --- ProseMirror integration (Phase 42b, 42c) ---
autofitColumn(view, event, measureFn): boolean  // returns true if handled

export const TableAutofit = Extension.create({
  name: 'tableAutofit',
  addProseMirrorPlugins() {
    return [new Plugin({
      key: new PluginKey('tableAutofit'),
      props: {
        handleDOMEvents: {
          dblclick(view, event) {
            // 1. Find cell under click
            // 2. Check if click is within HANDLE_ZONE of left/right border
            // 3. If yes → resolve column index → autofitColumn
            // 4. If no → return false (ignore)
          }
        }
      }
    })]
  }
})
```

### Double-click handler logic

```
dblclick(event):
  1. cell = cellAround(event.target)           // find TD/TH under cursor
  2. if !cell: return false
  3. rect = cell.getBoundingClientRect()
  4. if (rect.right - event.clientX <= HANDLE_ZONE):
       colIndex = columnIndex(cell, 'right')    // column to the left of right border
     else if (event.clientX - rect.left <= HANDLE_ZONE):
       colIndex = columnIndex(cell, 'left')     // column to the left of left border
     else:
       return false                             // click in cell middle → ignore
     5. autofitColumn(view, colIndex, measureTextWidth)
     6. return true
```

### Autofit logic

```
autofitColumn(view, colIndex, measureFn):
  1. Find the table DOM element
  2. contentWidth = measureColumnContentWidth(tableDom, colIndex, measureFn)
  3. targetWidth = max(MIN_COLUMN_WIDTH, contentWidth + AUTOFIT_PADDING)
  4. Walk all cells in column (using TableMap), set colwidth[index] = targetWidth
  5. Dispatch transaction
```

### Measurement approach

Use a canvas `measureText` with the cell's computed font:
```
measureTextWidth(text, font):
  canvas = document.createElement('canvas')
  ctx = canvas.getContext('2d')
  ctx.font = font
  return ctx.measureText(text).width
```

For each cell: get `getComputedStyle(cell).font`, read `textContent`, measure. Take max across column.

### CSS additions (`src/index.css`) — make built-in handles visible

```css
/* Make the built-in column-resize-handle visible.
   The element already exists in the DOM on hover (rendered by
   prosemirror-tables' handleDecorations). We just style it. */
.column-resize-handle {
  position: absolute;
  width: 6px;
  margin-left: -3px;
  top: 0;
  bottom: 0;
  cursor: col-resize;
  background: rgba(59, 130, 246, 0.25);   /* blue-500 @ 25% */
  border-radius: 2px;
  z-index: 10;
  transition: background 0.15s;
}
.column-resize-handle:hover {
  background: rgba(59, 130, 246, 0.6);    /* blue-500 @ 60% */
}

/* Built-in class applied to editor while hovering a handle */
.resize-cursor {
  cursor: col-resize !important;
}
```

> **Note:** The `.column-resize-handle` widget is placed by ProseMirror at the cell's right edge (end of cell content). The `position: absolute` + `top/bottom: 0` stretches it to full cell height. If ProseMirror's widget positioning places it inline rather than absolute, we may need the table cell to have `position: relative` — verify in browser and adjust.

---

## 5. Why This Is Minimal (Occam's Razor check)

| Approach | Effort | Verdict |
|----------|--------|---------|
| **Custom full replacement** (custom drag + handles + hit-testing + autofit) | ~28 tests, new plugin, disable built-in | ❌ Reinvents what works |
| **CSS + small autofit extension** (this plan) | ~11 tests, CSS + 1 small extension, keep built-in | ✅ Only adds what's missing |

We keep the built-in `resizable: true` and all its battle-tested drag logic (colspan handling, last-column constraint, drag preview, transaction dispatch). We only:
1. **Style** the handles that already exist in the DOM
2. **Add** a `dblclick` handler for autofit (genuinely new feature)

---

## 6. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| `.column-resize-handle` widget positioning may be inline, not absolute | Verify in browser; if needed, add `position: relative` to `td`/`th` and adjust handle CSS |
| jsdom returns 0 for `measureText`/`scrollWidth` | `measureTextWidth` is injectable; tests stub it. Integration tests verify transaction dispatch, not pixel values |
| Double-click also fires two click events | `dblclick` is its own event; handler returns `true` to prevent default only when autofit triggers |
| Autofit measurement misses styled text (bold/italic vary width) | Use cell's computed `font` shorthand (includes weight/style/size) for measurement |
| Built-in `resize-cursor` class conflicts | It's already applied by the built-in plugin; our CSS just styles the handle element |

---

## 7. Estimated Test Count

| Phase | Tests |
|-------|-------|
| 42a measurement | 5 |
| 42b autofit transaction | 4 |
| 42c dblclick handler + integration | 4 |
| **Total new** | **13** |

**Projected total:** ~1025 tests (58 suites)

---

## 8. Verification

After each phase: `npx vitest run src/extensions/TableAutofit.test.ts`
After all phases: `npm test && npm run lint && npm run type-check && npm run build`
