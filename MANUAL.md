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
- [Table of Contents](#table-of-contents)
- [Page Navigation](#page-navigation)
- [Search & Replace](#search--replace)
- [Text-to-Speech (TTS)](#text-to-speech-tts)
- [File Operations](#file-operations)
  - [Sharing & Cloud Storage](#sharing--cloud-storage)
    - [Google Drive Setup](#google-drive-setup)
    - [OneDrive Setup](#onedrive-setup)
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
| **File** | New, Open, Save, Import Word, Export ▸ (PDF / Markdown), Print, Page Setup, Recent Files |

> **Open** and **Save** open a single dialog that covers local files, sharing (copy link / native share sheet), and cloud storage (Google Drive / OneDrive / S3 under an "Advanced" section). |
| **Edit** | Copy, Cut, Paste |
| **Insert** | Image, Link, Table, Field, Merge Fields, Page Break |
| **View** | Zoom levels (50%–200% with +/− step buttons), Full-Bleed view toggle, Launch in Full-Bleed by Default |
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

- **View → Zoom** → Choose 50%, 75%, 100%, 125%, 150%, or 200%.
- Use the **+/−** buttons for 10% increments.
- 50% gives an overview of multiple pages; 200% is ideal for detail work.
- 100% is the default (actual size).

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

## Table of Contents

SimpleDocs can auto-generate a Table of Contents (TOC) from your document's heading styles.

### Inserting a Table of Contents

1. Go to **Insert → Table of Contents**.
2. Adjust the **From level** and **To level** filters to control which headings appear (e.g., H1–H3 only).
3. Review the **Preview** panel showing all matched headings with page numbers.
4. Click **Insert TOC** to add it at the cursor position.

### Replacing a TOC

- If a TOC already exists, the modal shows a warning and the button changes to **Replace TOC**.
- Replacing removes the old TOC and inserts a new one with updated page numbers.

### How It Works

- The TOC scans your document for heading styles (H1–H6).
- Each heading gets a unique anchor ID.
- TOC entries are internal hyperlinks — click any entry to jump to that heading.
- You can manually edit the TOC content after insertion.

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

## Text-to-Speech (TTS)

SimpleDocs can read your document aloud using your browser's built-in speech synthesis. No internet connection required.

### Opening the TTS Panel

| Method | Action |
|--------|--------|
| Keyboard | `Ctrl + Shift + T` |
| Toolbar | Click the **🔊** icon |
| Menu | Insert → Read Aloud |

### Reading Text

- **Read All** — reads the entire document from start to finish.
- **Selection** — reads only the currently selected text (disabled when nothing is selected).

### Playback Controls

| Control | Description |
|---------|-------------|
| ▶ Play / ⏸ Pause | Toggle playback |
| ⏹ Stop | Stop reading and reset to beginning |
| 🔊 / 🔇 | Toggle mute |

### Voice Selection

- The **Voice** dropdown shows all voices installed on your system.
- Voices marked with ☁ are remote/network voices (require internet).
- Local voices work offline.
- The default voice uses your browser's default.

### Speed and Volume

- **Speed** slider: 0.5× (slow) to 2.0× (fast), in 0.1× steps.
- **Volume** slider: 0% (mute) to 100% (max), in 5% steps.
- Settings apply immediately to current and future speech.

### Status

The status bar shows:
- **Ready** — panel open, nothing playing
- **Reading... (XX%)** — actively reading with progress percentage
- **Paused (XX%)** — paused at current position
- **Finished** — reading complete
- **Error: [message]** — an error occurred

### Tips

- TTS uses your operating system's installed voices. For more/better voices, install language packs in your OS settings.
- Long documents are split into sentences for natural pauses at punctuation.
- You can continue editing while TTS reads — the panel stays docked at the bottom.
- Press `Escape` or click ✕ to close the panel (stops playback).

---

## File Operations

### Saving & Opening

| Operation | Menu Path | Description |
|-----------|-----------|-------------|
| **New** | File → New | Start a fresh document |
| **Save** | File → Save | Open the save dialog — save as a local file, share a link, or send via the share sheet (see below) |
| **Open** | File → Open | Open the open dialog — open a local file, a shared link, or a cloud document (see below) |
| **Import Word** | File → Import Word | Import a `.docx` file (converts to editor content) |

### Sharing & Cloud Storage

The **Save** / **Open** dialog opens to a userland home view that needs no accounts and no setup — you can share a document the moment you open the dialog.

#### Quick share (no accounts)

| Action | Mode | What it does |
|--------|------|--------------|
| **Copy Link** | Save | Generates a self-contained share link. The whole document is compressed into the URL fragment, so anyone who opens the link gets your document — no upload, no server. |
| **Share File** | Save | Opens the device's native share sheet with the document attached as a `.sdjson` file (works with messaging, email, AirDrop, etc.). Falls back to a download if the OS has no share sheet. |
| **Save to File** | Save | Downloads the document as a `.sdjson` file you can store anywhere. |
| **Open from File** | Open | Choose a `.sdjson` file from your device to load it into the editor. |

> **Size limit:** share links are capped at ~30 KB of compressed content. If your document is too large for a link, **Copy Link** is disabled and you'll see a notice — use **Save to File** or **Share File** instead.

> **Opening a shared link:** open the link in a browser and the document loads automatically. Refreshing the page won't reload it (the link fragment is cleared once opened).

#### Cloud accounts (optional)

Google Drive, Microsoft OneDrive, and S3-compatible storage are still available under an **Advanced** section at the bottom of the dialog. First-time use requires connecting a cloud provider via OAuth. See [Google Drive Setup](#google-drive-setup) or [OneDrive Setup](#onedrive-setup) for setup instructions.

### Exporting

| Format | Menu Path | Description |
|--------|-----------|-------------|
| **PDF** | File → Export PDF | Generate a searchable, selectable PDF via pdfmake with exact margins |
| **Markdown** | File → Export Markdown | Download document as `.md` file |
| **Print** | File → Print | Native browser print dialog |

### Google Drive Setup

SimpleDocs can save and open documents directly from Google Drive.

#### Prerequisites

Before using Google Drive, you need to configure OAuth credentials:

1. **Create a Google Cloud project** (or use an existing one):
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable the required APIs:**
   - Enable **Google Drive API**
   - Enable **Google Picker API**

3. **Create OAuth 2.0 credentials:**
   - Go to **Credentials** → **Create Credentials** → **OAuth Client ID**
   - Choose **Application type: Web application**
   - Add your origin URL to **Authorized JavaScript origins**:
     - For local development: `http://localhost:5173`
     - For production: `https://code24x7-r.github.io`
   - Click **Create** and copy the Client ID

4. **Configure SimpleDocs:**
   - Create a `.env` file in the project root (if not exists)
   - Add: `VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com`
   - Restart the development server

#### Saving to Google Drive

1. Make sure you're connected (see below)
2. **File → Save**, then expand **Advanced: cloud accounts** and select **Google Drive**
3. Enter a filename (`.sdjson` extension is added automatically)
4. Click **Save to Drive**
5. Your document is saved to the root of your Google Drive

#### Opening from Google Drive

1. Make sure you're connected (see below)
2. **File → Open**, then expand **Advanced: cloud accounts** and select **Google Drive**
3. Browse your Drive files using the built-in picker
4. Or view a list of recently saved SimpleDocs files
5. Click **Open** to load the document into the editor

#### Connecting to Google Drive

1. Click **File → Save** or **File → Open**
2. Select **Google Drive** as the provider
3. A Google consent popup will appear
4. Grant permission for the app to access your Drive files
5. Once connected, you can save/open documents

#### Disconnecting

- Click **Disconnect** at the bottom of the modal to revoke access
- Your access token is cleared from the browser

> **Privacy:** SimpleDocs uses the `drive.file` scope, which only allows access to files created or opened by this app. It cannot access your other Google Drive files.

---

### OneDrive Setup

SimpleDocs can save and open documents directly from Microsoft OneDrive.

#### Prerequisites

Before using OneDrive, you need to configure OAuth credentials:

1. **Register an app in Azure AD** (Microsoft Entra admin center):
   - Go to [Azure Portal](https://portal.azure.com/) → **Microsoft Entra ID** → **App registrations**
   - Click **New registration**
   - Enter a name (e.g., "SimpleDocs")
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
   - Redirect URI: **Single-page application (SPA)**
     - For local development: `http://localhost:5173`
     - For production: `https://code24x7-r.github.io`
   - Click **Register**

2. **Copy the Application (client) ID** from the app overview page

3. **Add API permissions:**
   - Go to **API permissions** → **Add a permission**
   - Select **Microsoft Graph** → **Delegated permissions**
   - Add: **Files.ReadWrite.AppFolder** (access only app-created files)
   - Click **Grant admin consent** (if required by your organization)

4. **Configure SimpleDocs:**
   - Create a `.env` file in the project root (if not exists)
   - Add: `VITE_MICROSOFT_CLIENT_ID=your-application-client-id`
   - Restart the development server

#### Saving to OneDrive

1. Make sure you're connected (see below)
2. **File → Save**, then expand **Advanced: cloud accounts** and select **OneDrive**
3. Enter a filename (`.sdjson` extension is added automatically)
4. Click **Save to OneDrive**
5. Your document is saved to the OneDrive app folder

#### Opening from OneDrive

1. Make sure you're connected (see below)
2. **File → Open**, then expand **Advanced: cloud accounts** and select **OneDrive**
3. View a list of recently saved SimpleDocs files
4. Click **Open** to load the document into the editor

#### Connecting to OneDrive

1. Click **File → Save** or **File → Open**
2. Select **OneDrive** as the provider
3. A Microsoft sign-in popup will appear
4. Sign in with your Microsoft account and grant permission
5. Once connected, you can save/open documents

#### Disconnecting

- Click **Disconnect** at the bottom of the modal to revoke access
- Your access token is cleared from the browser

> **Privacy:** SimpleDocs uses the `Files.ReadWrite.AppFolder` scope, which only allows access to files created by this app in a special app folder. It cannot access your other OneDrive files.

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
| **Table Formatting** | Border thickness, cell background color |
| **Print-Optimized CSS** | `@media print` styles for better print output |
| **Fit-to-Width Zoom** | Auto-zoom to fit page width |
| **Spell Check** | Built-in spell checking |
| **Collaborative Editing** | Real-time multi-user editing |
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

6. **Use zoom for overview.** Drop to 50% to see multiple pages at once, or go to 200% for fine detail work.

7. **The bubble menu is context-aware.** Select text to see a floating toolbar with Bold, Italic, Underline, Highlight, and Link — no need to move your cursor to the main toolbar.

8. **Search preserves formatting.** Replace operations maintain text colors, fonts, and other styles.

9. **URLs auto-link.** Paste a URL and it automatically becomes clickable.

10. **Word import estimates page breaks.** When importing a `.docx`, the importer estimates wrapped lines and splits content across pages.

11. **Keyboard shortcuts mirror industry standards.** If it works in Word or Google Docs, it probably works here too.

12. **Status bar shows live stats.** Word count, character count, and reading time update as you type.

13. **Edit the title in the title bar.** The title bar is editable — click it and type to rename your document.

14. **Import Word documents.** Drag a `.docx` file through **File → Import Word** — mammoth.js handles the conversion.

15. **Custom template fields for mail merge.** Insert `{{client_name}}` or `{{invoice_number}}` and use Merge Fields to fill them all at once.
