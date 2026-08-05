# SimpleDocs User Manual

> **Version:** 1.0.0 — Last updated: August 2026

## Table of Contents

- [Getting Started](#getting-started)
- [UI Layout](#ui-layout)
- [Editing Text](#editing-text)
- [Page Layout & Setup](#page-layout--setup)
- [Tables](#tables)
- [Template Fields](#template-fields)
- [Images](#images)
- [Hyperlinks](#hyperlinks)
- [Page Navigation](#page-navigation)
- [Search & Replace](#search--replace)
- [File Operations](#file-operations)
- [AI Chat Panel](#ai-chat-panel)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Planned Features](#planned-features)
- [Quick Reference Card](#quick-reference-card)
- [Tips & Hints](#tips--hints)

---

## Getting Started

SimpleDocs is a browser-based WYSIWYG document editor — no installation required. Open the URL and start typing.

**Quick start:**
1. Open [SimpleDocs](https://Code24x7-R.github.io/simpledocs/) in your browser.
2. Type your content in the editor area.
3. Format text using the toolbar or keyboard shortcuts.
4. Save your work via **File → Save JSON** (downloads a `.json` file).

**Auto-save:** Your document automatically saves to browser localStorage every 500ms. When you reopen the browser, your document is restored exactly as you left it.

**New document:** Click **File → New** to start fresh. Your previous work remains in localStorage.

**Load demo:** Click **File → Load Demo** to explore a sample document with pre-filled content.

---

## UI Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│  SimpleDocs       File   Edit   Insert   View   Help    [Document Title] │  Menu bar
├──────────────────────────────────────────────────────────────────────────┤
│  [Style ▾] [Font ▾] [Size ▾] [Format ▾] │ [B I U S] │ [⟵ ⟷ → ⟸] │      │  Toolbar
│  [≡ ≡ ≡] [☑] [§] [┃] │ [🔍] [💬]                                       │
├──────────────────────────────────────────────────────────────────────────┤
│  [◀]  Page 1 of 3  [▶]    Ln 1, Col 1   142 words · 840 chars · 1 min   │  Page nav
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                                                                    │  │
│  │                        Page 1 (A4/Letter)                         │  │  Editor
│  │                                                                    │  │  viewport
│  │  Your document content appears here...                             │  │
│  │                                                                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                                                                    │  │
│  │                        Page 2                                      │  │
│  │                                                                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Menu Bar

| Menu | Purpose |
|------|---------|
| **File** | New, Open, Save, Import Word, Export (PDF/Markdown), Print, Page Setup, Recent Files |
| **Edit** | Copy, Cut, Paste |
| **Insert** | Image, Link, Table, Field, Merge Fields, Page Break |
| **View** | Zoom levels (75%, 100%, 125%) |
| **Help** | Keyboard Shortcuts, About SimpleDocs, SimpleSheet link |

### Toolbar

The toolbar provides one-click access to all formatting controls:

| Section | Controls |
|---------|----------|
| **Style** | Normal, Heading 1, Heading 2, Heading 3 |
| **Font** | Font family dropdown (Arial, Times New Roman, Courier New, Georgia, Verdana, Helvetica) |
| **Size** | Font size (8–72pt) |
| **Format** | Bold, Italic, Underline, Strikethrough, Clear Formatting, Text Color palette, Highlight palette |
| **Clipboard** | Copy, Cut, Paste |
| **History** | Undo, Redo |
| **Alignment** | Left, Center, Right, Justify |
| **Lists** | Bullet, Numbered, Task list |
| **Blocks** | Blockquote, Code block, Horizontal Rule |
| **Tools** | Search & Replace, Chat panel toggle |

### Status Bar

The status bar below the editor shows:
- **Page navigation** — Previous/Next page buttons, current page indicator (click to jump to a page)
- **Cursor position** — Line and column numbers
- **Document stats** — Word count, character count, estimated reading time

---

## Editing Text

### Text Formatting

SimpleDocs supports all standard text formatting options.

| Format | How to Apply |
|--------|-------------|
| **Bold** | Select text → Click **B** in toolbar, or press `Ctrl + B` |
| *Italic* | Select text → Click *I* in toolbar, or press `Ctrl + I` |
| Underline | Select text → Click <u>U</u> in toolbar, or press `Ctrl + U` |
| ~~Strikethrough~~ | Select text → Click ~~S~~ in toolbar, or press `Ctrl + Shift + S` |
| Inline code | Select text → Press `Ctrl + E` |
| Clear formatting | Select text → Click **Clear Formatting** in Format menu |

### Colors

**Text Color:**
1. Select text.
2. Open the **Format** menu in the toolbar.
3. Click a color swatch in the **Text Colour** grid.
4. Click **Default (no colour)** to remove text color.

**Highlight:**
1. Select text.
2. Open the **Format** menu in the toolbar.
3. Click a color swatch in the **Highlight** grid.
4. Click **None (remove highlight)** to remove highlighting.

> **Tip:** Both text color and highlight can be applied independently — highlight won't override your text color.

### Typography

**Font Family:**
- Select text → Click the **Font** dropdown in the toolbar → Choose a font.
- Click **Default** to remove custom font (revert to browser default).

**Font Size:**
- Select text → Click the **Size** dropdown in the toolbar → Choose a size (8–72pt).
- Click **Default** to remove custom font size.

### Headings & Paragraph Styles

| Style | How to Apply |
|-------|-------------|
| Normal | Style dropdown → **Normal** |
| Heading 1 | Style dropdown → **Heading 1**, or `Ctrl + Alt + 1` |
| Heading 2 | Style dropdown → **Heading 2**, or `Ctrl + Alt + 2` |
| Heading 3 | Style dropdown → **Heading 3**, or `Ctrl + Alt + 3` |
| Blockquote | Click § in toolbar, or `Ctrl + Shift + B` |
| Code block | Click **</>** in toolbar, or `Ctrl + Alt + C` |

### Text Alignment

| Alignment | How to Apply |
|-----------|-------------|
| Left | Click **⟵** in toolbar, or `Ctrl + Shift + L` |
| Center | Click **⟷** in toolbar, or `Ctrl + Shift + E` |
| Right | Click **→** in toolbar, or `Ctrl + Shift + R` |
| Justify | Click **⟸** in toolbar, or `Ctrl + Shift + J` |

### Lists

| List Type | How to Apply |
|-----------|-------------|
| Bullet list | Click **≡** in toolbar |
| Numbered list | Click **≡≡** in toolbar |
| Task list | Click **☑** in toolbar (checkboxes) |

> **Tip:** Press `Tab` to indent list items, `Shift + Tab` to outdent.

### Block Elements

| Element | How to Apply |
|---------|-------------|
| Blockquote | Click § in toolbar |
| Code block | Click **</>** in toolbar |
| Horizontal rule | Click **—** in toolbar |

---

## Page Layout & Setup

### Opening Page Setup

- **File → Page Setup**

### Page Settings

| Setting | Options |
|---------|---------|
| **Page Size** | A4 (210 × 297 mm), Letter (8.5 × 11 in) |
| **Orientation** | Portrait, Landscape |
| **Margins** | Top, Bottom, Left, Right (in mm) |
| **Header** | Enable/disable, custom text (supports `{title}` variable) |
| **Footer** | Enable/disable, page number toggle ("Page X of Y") |
| **Widow/Orphan Control** | Minimum lines to keep together at page breaks (1–10) |

### Page Breaks

- **Insert → Page Break** or press `Ctrl + Enter` to force content onto the next page.
- Content auto-flows to the next page when the current page is full.

### Zoom

- **View → Zoom** → Choose 75%, 100%, or 125%.
- 75% gives a full-page overview; 125% is ideal for detail work.

---

## Tables

### Inserting a Table

1. Place your cursor where you want the table.
2. **Insert → Table** (or **Insert → Table** in the menu bar).
3. Hover over the grid to select up to 10 rows × 10 columns.
4. Click to insert — tables include a header row by default.

### Table Context Menu

Right-click inside a table to access table operations:

| Operation | Description |
|-----------|-------------|
| **Add Row Above** | Inserts a row before the current row |
| **Add Row Below** | Inserts a row after the current row |
| **Delete Row** | Removes the current row |
| **Add Column Left** | Inserts a column before the current column |
| **Add Column Right** | Inserts a column after the current column |
| **Delete Column** | Removes the current column |
| **Merge Cells** | Merges selected cells into one |
| **Split Cell** | Splits a merged cell back into individual cells |
| **Toggle Header Row** | Toggles header formatting for the first row |
| **Toggle Header Column** | Toggles header formatting for the first column |

> **Tip:** Select multiple cells (click + drag or `Shift + click`) before merging.

---

## Template Fields

Template fields are inline variables that display dynamic content. They render as non-editable badges in the editor.

### Inserting a Field

1. Place your cursor where you want the field.
2. **Insert → Field**.
3. Choose a standard field or click **+ Custom field...** for a custom name.

### Standard Fields

| Field | Resolves To |
|-------|-------------|
| `{{current_date}}` | Today's date |
| `{{document_title}}` | Document title (from the title bar) |
| `{{page_number}}` | Current page number |
| `{{total_pages}}` | Total page count |

### Custom Fields

1. Click **+ Custom field...** in the Insert Field dialog.
2. Enter a field name (e.g., `client_name`).
3. Click **Insert** — the badge `{{client_name}}` appears in the editor.

### Merging Fields

Merge replaces all template fields with their resolved values:

1. **Insert → Merge Fields**.
2. The dialog shows all fields found in the document.
3. Enter values for custom fields in the provided inputs.
4. Standard fields auto-resolve (date, title, page number, total pages).
5. Click **Merge All Fields** — badges are replaced with actual values.

> **Warning:** Merging is a destructive operation. Merged fields become plain text and can no longer auto-update.

---

## Images

### Inserting an Image

1. Place your cursor where you want the image.
2. **Insert → Image**.
3. Choose **Upload** (file from your computer) or **URL** (link to an image).
4. For upload: click the drop zone and select an image file (PNG, JPG, GIF, WebP, SVG, max 5MB).
5. For URL: paste the image address.
6. Optionally enter **Alt Text** for accessibility.
7. Review the preview.
8. Click **Insert Image**.

### Image Guidelines

- Supported formats: PNG, JPG, GIF, WebP, SVG
- Maximum file size: 5MB
- Uploaded images are converted to base64 and embedded in the document
- Alt text is stored for accessibility and export

---

## Hyperlinks

### Inserting a Link

| Method | Action |
|--------|--------|
| Menu | Select text → **Insert → Link** |
| Keyboard | Select text → `Ctrl + K` |
| Toolbar | Click the **Link** icon in the bubble menu |

1. Enter the URL (must start with `http://`, `https://`, `mailto:`, or `tel:`).
2. Optionally enter **Display Text** (defaults to the URL).
3. Click **Insert**.

### Editing a Link

- Click an existing link → Press `Ctrl + K` to edit.
- Or right-click the link and use the bubble menu.

### Removing a Link

- Open the link dialog (via `Ctrl + K`) → Click **Remove Link**.

### Auto-Link

- URLs pasted as plain text are automatically converted into clickable links.

---

## Page Navigation

### Navigating Between Pages

| Method | Action |
|--------|--------|
| Click | Scroll to the desired page in the editor viewport |
| Keyboard (between lines) | `Arrow Up` / `Arrow Down` — moves between lines and across page boundaries |
| Keyboard (jump) | `Page Up` — jump to previous page, `Page Down` — jump to next page |
| Status bar | Click **◀** / **▶** buttons |
| Direct jump | Click the page number in the status bar → type a page number → `Enter` |

### Inserting a Page Break

- Place cursor where you want the break → Press `Ctrl + Enter`.
- Or: **Insert → Page Break**.

### Cross-Page Editing

- **Arrow Up** at the start of a page moves to the end of the previous page.
- **Arrow Down** at the end of a page moves to the start of the next page.
- **Backspace** at the start of a page merges content into the previous page.

---

## Search & Replace

### Opening Search & Replace

| Method | Action |
|--------|--------|
| Keyboard | `Ctrl + H` or `Ctrl + F` |
| Toolbar | Click the **🔍** icon |

### Search Options

| Option | Description |
|--------|-------------|
| **Case** | Match uppercase/lowercase exactly |
| **Word** | Match whole words only |
| **Regex** | Use regular expression patterns |

### Finding Text

1. Type your search term in the **Search for** field.
2. Match count updates live as you type (debounced).
3. Click **Next** (or press `F3`) to go to the next match.
4. Click **Previous** (or press `Shift + F3`) to go to the previous match.
5. The status bar shows "X of Y matches".

### Replacing Text

1. Enter a **Replace with** value.
2. Click **Replace** (or `Ctrl + Enter`) to replace the current match and advance.
3. Click **All** to replace all occurrences at once.
4. The result banner confirms how many occurrences were replaced.

### Tips

- Selected text is automatically populated into the search field when you open Search & Replace.
- Regular expressions support standard JS regex syntax.
- Replacing preserves text formatting (colors, font, etc.).

---

## File Operations

### Saving & Opening

| Operation | Menu Path | Description |
|-----------|-----------|-------------|
| **New** | File → New | Start a fresh document |
| **Save JSON** | File → Save JSON | Download document as `.json` file |
| **Open JSON** | File → Open JSON | Open a previously saved `.json` document |
| **Import Word** | File → Import Word | Import a `.docx` file (converts to editor content) |

### Exporting

| Format | Menu Path | Description |
|--------|-----------|-------------|
| **PDF** | File → Export PDF | Generate PDF via html2pdf.js with exact margins |
| **Markdown** | File → Export Markdown | Download document as `.md` file |
| **Print** | File → Print | Native browser print dialog |

### Recent Files

- The **File → Recent Files** section shows up to 5 recently opened files.
- Click a file name to view its info (note: actual content must be re-opened via Open JSON).

### Auto-Save

- Your document saves to browser localStorage automatically every 500ms.
- When you reopen the app, your document is restored from the last auto-save.
- Auto-save is a browser safety net — use **Save JSON** for portable backups.

---

## AI Chat Panel

SimpleDocs includes an integrated AI chat panel for assistance with your document.

### Opening the Chat Panel

- Click the **💬** icon in the toolbar, or
- Toggle via the toolbar chat button.

### Supported Providers

| Provider | Description |
|----------|-------------|
| **LM Studio** | Local LLM server (default: `http://localhost:1234`) |
| **Google Gemini** | Cloud-based Google AI (requires API key from AI Studio) |

### Setting Up a Provider

1. Click **Settings** in the chat panel (or the gear icon).
2. Select **Add Provider**.
3. Choose your provider type:
   - **LM Studio:** Enter your server URL → Test Connection.
   - **Gemini:** Enter your API key → Select a model → Test Connection.
4. Click **Add** to save the provider.

### Chat Features

| Feature | Description |
|---------|-------------|
| **Model selector** | Choose from available models (populated from the active provider) |
| **Connection status** | Green = connected, Red = disconnected, Spinner = checking |
| **System prompt** | Customize the AI's system instructions |
| **Temperature** | Control response randomness (0.0–2.0) |
| **Clear history** | Reset the conversation |
| **Context window** | Up to 65,535 tokens for conversation history |

> **Tip:** The chat panel uses your document content for context. Ask the AI to summarize, rephrase, or expand your text.

---

## Keyboard Shortcuts

### Text Formatting

| Shortcut | Action |
|----------|--------|
| `Ctrl + B` | Bold |
| `Ctrl + I` | Italic |
| `Ctrl + U` | Underline |
| `Ctrl + Shift + S` | Strikethrough |
| `Ctrl + E` | Inline code |
| `Ctrl + K` | Insert/edit link |

### Headings

| Shortcut | Action |
|----------|--------|
| `Ctrl + Alt + 1` | Heading 1 |
| `Ctrl + Alt + 2` | Heading 2 |
| `Ctrl + Alt + 3` | Heading 3 |

### Paragraph Styles

| Shortcut | Action |
|----------|--------|
| `Ctrl + Shift + B` | Blockquote |
| `Ctrl + Alt + C` | Code block |
| `Ctrl + Shift + L` | Align left |
| `Ctrl + Shift + E` | Align center |
| `Ctrl + Shift + R` | Align right |
| `Ctrl + Shift + J` | Justify |

### Editing

| Shortcut | Action |
|----------|--------|
| `Ctrl + Z` | Undo |
| `Ctrl + Y` | Redo |
| `Ctrl + Shift + Z` | Redo (alternate) |
| `Ctrl + A` | Select all |
| `Ctrl + C` | Copy |
| `Ctrl + V` | Paste |
| `Ctrl + X` | Cut |
| `Enter` | New line / split block |
| `Shift + Enter` | Line break (soft return) |
| `Backspace` | Delete / merge with previous page |
| `Delete` | Delete forward |

### Page Navigation

| Shortcut | Action |
|----------|--------|
| `Arrow Down` | Next line (or next page at end) |
| `Arrow Up` | Previous line (or prev page at start) |
| `Page Down` | Jump to next page |
| `Page Up` | Jump to previous page |
| `Ctrl + Enter` | Insert page break |

### Search & Replace

| Shortcut | Action |
|----------|--------|
| `Ctrl + H` | Open Find & Replace |
| `Ctrl + F` | Open Find & Replace |
| `F3` | Find next match |
| `Shift + F3` | Find previous match |
| `Ctrl + Enter` | Replace current match (when search panel open) |
| `Escape` | Close search panel |

### Document

| Shortcut | Action |
|----------|--------|
| `Ctrl + S` | Save (browser default — triggers browser save dialog) |
| `Ctrl + P` | Print |

---

## Planned Features

The following features are on the roadmap for future releases:

| Feature | Description |
|---------|-------------|
| **Subscript/Superscript** | Subscript and superscript text formatting |
| **Syntax Highlighting** | Code syntax highlighting in code blocks |
| **Document Outlines** | Headings tree navigation panel |
| **Table Formatting** | Border thickness, cell background color |
| **Print-Optimized CSS** | `@media print` styles for better print output |
| **Fit-to-Width Zoom** | Auto-zoom to fit page width |
| **Spell Check** | Built-in spell checking |
| **Collaborative Editing** | Real-time multi-user editing |
| **Cloud Storage** | Integration with cloud providers |
| **DOCX Export** | Export to Microsoft Word format |
| **Markdown Import** | Paste markdown → convert to editor content |
| **Floating Menu** | Insert menu on empty line |
| **@Mentions** | @mention with autocomplete |
| **Video Embed** | YouTube and video embedding |
| **Typography Extension** | Smart quotes, dashes, typographic replacements |

---

## Quick Reference Card

### Most Common Tasks

| Task | How |
|------|-----|
| Bold text | Select → `Ctrl + B` |
| Insert link | Select → `Ctrl + K` |
| Insert table | Insert → Table → Select grid size |
| Insert image | Insert → Image → Upload or URL |
| Search & Replace | `Ctrl + H` |
| Undo | `Ctrl + Z` |
| New page | `Ctrl + Enter` |
| Save document | File → Save JSON |
| Export PDF | File → Export PDF |
| Change font | Select → Font dropdown → Choose |
| Change page size | File → Page Setup |

### Format Painter Shortcuts

| Action | Shortcut |
|--------|----------|
| Bold | `Ctrl + B` |
| Italic | `Ctrl + I` |
| Underline | `Ctrl + U` |
| Strikethrough | `Ctrl + Shift + S` |
| Link | `Ctrl + K` |

### Navigation Quick Reference

| Action | Shortcut |
|--------|----------|
| Next page | `Page Down` |
| Previous page | `Page Up` |
| Jump to page | Click page number in status bar |
| New page break | `Ctrl + Enter` |

---

## Tips & Hints

1. **Auto-save is your safety net.** Even if you forget to manually save, your work persists in localStorage. Use **Save JSON** for portable backups.

2. **PDF export matches your settings.** The PDF respects your page size, margins, orientation, and header/footer settings from Page Setup.

3. **Template fields are non-editable.** Once inserted, you can't accidentally type inside a field badge. Click the × to remove it.

4. **Tables auto-include headers.** New tables have a header row by default — right-click to toggle headers or access other table operations.

5. **Page breaks persist.** Manual page breaks are saved in your document and restore on reload.

6. **Use zoom for overview.** Drop to 75% to see the full page layout, or 125% for detail work.

7. **The bubble menu is context-aware.** Select text to see a floating toolbar with Bold, Italic, Underline, Highlight, and Link — no need to move your cursor to the main toolbar.

8. **Search preserves formatting.** Replace operations maintain text colors, fonts, and other styles.

9. **URLs auto-link.** Paste a URL and it automatically becomes clickable.

10. **Word import estimates page breaks.** When importing a `.docx`, the importer estimates wrapped lines and splits content across pages.

11. **Keyboard shortcuts mirror industry standards.** If it works in Word or Google Docs, it probably works here too.

12. **Status bar shows live stats.** Word count, character count, and reading time update as you type.

13. **Edit the title in the title bar.** The title bar is editable — click it and type to rename your document.

14. **Import Word documents.** Drag a `.docx` file through **File → Import Word** — mammoth.js handles the conversion.

15. **Custom template fields for mail merge.** Insert `{{client_name}}` or `{{invoice_number}}` and use Merge Fields to fill them all at once.
