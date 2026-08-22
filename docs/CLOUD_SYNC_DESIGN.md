# Cloud Sync & Sharing — Design Document

**Status:** Primary path IMPLEMENTED (2026-08-22); secondary path (QR code, File System Access) pending
**Author:** SimpleDocs team
**Created:** 2026-08-22
**Replaces:** The "developer-provisioned cloud project" model (Phase 36) as the *default* save/share path

## Implementation note

Steps 1–4 of the primary path are now live:
- `src/utils/shareUrl.ts` — URL-fragment encode/decode + size guard (`lz-string`).
- `src/utils/webShare.ts` — native share sheet with download fallback.
- `src/components/layout/CloudStorageModal.tsx` — refactored into a userland home view (Copy Link / Share File / Save to File / Open from File) with cloud providers moved under an "Advanced" `<details>` collapsible.
- `src/App.tsx` — hydrates a shared document from the `#doc=` fragment on startup.

See the commit on 2026-08-22 for details.

---

## 1. Problem Statement

SimpleDocs is 100% client-side — no backend, no server, no accounts. But the
current cloud save path (Phase 36) forces **one of two bad choices** on every
new user:

1. **Developer must provision cloud infrastructure** before the app is usable:
   a Google Cloud project with Drive + Picker APIs enabled and an OAuth Client
   ID (`VITE_GOOGLE_CLIENT_ID`), **or** an Azure AD app registration
   (`VITE_MICROSOFT_CLIENT_ID`), **or** the user must manually enter S3
   endpoint + bucket + access key + secret key.
2. **User is blocked from saving to the cloud at all** unless they (or the
   developer) complete that provisioning.

For a browser-based document editor, this is excessive. Creating a Google Cloud
project or an Azure AD registration is a developer task, not an end-user task.
S3 credentials are equally opaque to a normal user. The result: the cloud
features ship but sit dormant for anyone who isn't willing to set up a cloud
project first.

Meanwhile, the actual user need is simple: *save my document somewhere I can get
back to it, and share it with someone else.*

This document explores **userland** alternatives — save and share methods that
require **zero developer setup, zero user accounts, and zero servers** — and
recommends a layered implementation.

---

## 2. Current Architecture (Baseline)

Understanding what exists is essential because the new design reuses much of it.

### 2.1 Document model

A document is a single Tiptap JSON content tree wrapped in a `DocState`:

```ts
interface DocState {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  settings: DocSettings;
  content: Record<string, unknown>;   // Tiptap JSON
  totalPages: number;
}
```

Serialized to `.sdjson` (pretty-printed JSON). Also exportable to PDF, Markdown,
and HTML. Typical sizes observed in testing:

| Document | Raw JSON | Notes |
|----------|----------|-------|
| Empty doc | ~0.5 KB | |
| Short letter | ~3–8 KB | A few paragraphs |
| 40-paragraph test doc | ~25 KB | 8 KB of text, Tiptap node overhead |
| Image-heavy doc | 100 KB+ | Base64-encoded images dominate |

### 2.2 Existing save / export / cloud modules

| Module | Purpose |
|--------|---------|
| `utils/fileIO.ts` | Save-as-download (`.json`) and open-from-file-picker |
| `utils/pdfExport.ts` | Export to PDF (pdfmake) |
| `utils/htmlToMarkdown.ts` | Export to Markdown |
| `store/useDocStore.ts` | Auto-save to `localStorage` (debounced) |
| `components/layout/CloudStorageModal.tsx` | Cloud save/open UI (Google, OneDrive, S3) |
| `utils/driveApi.ts` / `driveAuth.ts` | Google Drive API + GIS OAuth |
| `utils/onedriveApi.ts` / `onedriveAuth.ts` | OneDrive Graph API + MSAL |
| `utils/s3Api.ts` / `s3Config.ts` / `s3SigV4.ts` | S3-compatible PUT/GET/LIST/DELETE |

The first four are userland-friendly. The cloud trio (Google/OneDrive/S3) each
carry the provisioning burden described in §1.

### 2.3 What we want to preserve

- 100% client-side — no backend, no server.
- The existing cloud providers stay as **advanced / opt-in** options. We are
  *adding* a zero-friction default, not removing choice.
- Document format (`.sdjson`) stays the source of truth; sharing is transport,
  not a new format.

---

## 3. Options Explored

Six userland approaches were evaluated. Each gets a SWOT analysis and an
implementation-effort rating.

Effort scale: **Tiny** (< ½ day) · **Small** (½–2 days) · **Medium** (2–5 days) ·
**Large** (1–2+ weeks).

---

### 3.1 Option A — URL / Fragment Sharing ("Copy Link")

**Mechanism:** Serialize `DocState` → compress with `lz-string`
(`encodeURIComponent`-safe LZ output) → place in the URL hash
(`#doc=<compressed>`). The full URL *is* the document. Copy it into email,
chat, a forum post, a bookmark. The recipient opens it and the app hydrates the
document from the hash.

**Example URL:**
```
https://simpledocs.app/#doc=eJw9W0tvG0cS_juCbn...
```

**Strengths**
- **Zero accounts, zero setup** — works for anyone who can copy a link.
- **Zero developer work** — no keys, no projects, no infrastructure.
- **Durable** — the link is self-contained; it survives hosting changes,
  domain moves, even the app itself (the hash is just compressed JSON).
- **Universal reach** — works on any device with a browser.

**Weaknesses**
- **Size ceiling.** lz-string output for a typical doc is 8–15 KB. Browsers
  vary on how much of `location.hash` they reliably expose to JS:
  - Chrome / Edge: ~2 MB (generous).
  - Safari / Firefox: ~64–200 KB (tight).
  - URL *display* degrades long before the limit — ugly but functional.
- **Snapshot only.** A shared link captures a moment. Two people editing from
  the same link diverge — no live sync.
- **No server = no deletion.** A link can't be "un-shared"; anyone with it
  keeps it. (Mitigation: documents contain no secrets by default; this is a
  word processor, not a vault.)

**Opportunities**
- A **size guard** (see §4.1) detects oversized docs and falls back to a file
  download, so users never hit a silent failure.
- Share links double as a **template gallery** — ship example docs as
  bookmarkable URLs.
- The same encoder powers Option C (QR codes) and Option D (short-code relay,
  §3.6).

**Threats**
- A future browser could tighten `location.hash` read limits further; we stay
  well under known ceilings with the size guard.

**Effort: Small (1–2 days).** Add `lz-string`, two pure functions
(`encodeDocToUrl`, `loadDocFromUrl`), a startup check of `location.hash`, a
copy-link button, and a size-guard warning.

---

### 3.2 Option B — Web Share API + File Hand-off

**Mechanism:** On supported browsers (especially mobile), call
`navigator.share({ files: [blob], title })`. The OS opens its native share
sheet — Messages, Mail, WhatsApp, Telegram, AirDrop, Save to Files, Notes, etc.
The document is attached as a `.sdjson` file. The recipient opens it in
SimpleDocs.

**Strengths**
- **Native UX** — the user already knows their OS share sheet; no new UI to
  learn.
- **Zero UI to build** — one API call, no custom dialog.
- **Works with any app the user prefers** — we don't integrate with Telegram,
  we integrate with *the OS*, which integrates with Telegram.
- **Best mobile experience** — AirDrop a doc between two phones, it opens in
  SimpleDocs.

**Weaknesses**
- **Weak desktop support.** Chrome and Edge support file sharing on desktop;
  Safari (macOS) is inconsistent; Firefox has partial support. A feature-detect
  + fallback is required.
- **File-only, no link.** The recipient needs SimpleDocs to open it; there's
  no "view in browser without the app" path. (Acceptable: this is a companion to
  Option A's link share, not a replacement.)

**Opportunities**
- Combine with Option A in one **Share menu**: "Copy Link" (URL) + "Share File"
  (Web Share) + "QR Code" (Option C). Three verbs, one entry point.

**Threats**
- `navigator.share` with files requires **HTTPS** — fine on GitHub Pages but
  worth noting for local development (test with `localhost`, which browsers
  treat as secure).

**Effort: Tiny (< ½ day).** One `async` function with feature detection and a
download fallback.

---

### 3.3 Option C — QR Code Cross-Device Transfer

**Mechanism:** When the user clicks "Open on phone" / "Send to device," render a
QR code (inline `<svg>` or `<canvas>`) containing the share URL from Option A.
The user scans it with their phone camera, opens SimpleDocs, and the document
loads. Uses the `qrcode` library.

**Strengths**
- **Intuitive for phone ↔ laptop** workflows — no typing a URL.
- **Fully offline** — the QR bitmap encodes the data; no network needed.
- **Great for demos and teaching** — project the QR, audience scans.

**Weaknesses**
- **Same size limit as Option A** — a QR can hold ~3 KB reliably at a
  scannable distance, ~8 KB with a large code and a good camera. Oversized
  docs must fall back to a smaller payload (e.g. a link to a file).
- **Adds a dependency** (`qrcode`, ~50 KB).
- Feels slightly niche on desktop-to-desktop (where copy-paste dominates).

**Opportunities**
- Auto-generate the QR whenever a share link is shown — zero extra user action.

**Threats**
- Mobile camera QR detection of dense codes (large docs) can be flaky; the
  size guard keeps codes in a reliable range.

**Effort: Small (1 day).** Add `qrcode`, render in the share dialog, reuse
Option A's encoder.

---

### 3.4 Option D — File System Access API (Save to a Synced Folder)

**Mechanism:** Replace (or augment) the classic "download blob + `<a click>`"
save with `window.showSaveFilePicker()`. The user picks a location — which can
be their **Dropbox, iCloud Drive, OneDrive desktop folder, or Google Drive
folder**. The app writes the `.sdjson` directly there. The user's *existing*
sync client handles the cloud upload. Open uses `showOpenFilePicker()`.

**Strengths**
- **No cloud integration code at all** — you write a file; the user's sync
  app uploads it. Zero API keys, zero OAuth.
- **Native Save / Open dialog** — feels professional and familiar.
- **Survives removal of all cloud providers** — it's just "save to disk."

**Weaknesses**
- **Browser support is the blocker.** Chrome and Edge support it; **Safari and
  Firefox do not** (Firefox behind a flag). ~70% global support. Requires a
  graceful fallback to the classic download for the other 30%.
- **No in-app file browser.** You can't list "recent cloud files" — it's a
  plain save/open. Loses the file-list UI that `CloudStorageModal` currently
  provides for Google/OneDrive/S3.

**Opportunities**
- Implement as **progressive enhancement**: try `showSaveFilePicker`, catch the
  `TypeError`, fall back to the existing download-blob path in `fileIO.ts`.
- Enables **auto-save** (debounced write to the same handle) for users on
  supported browsers — true "it just saves" behavior.

**Threats**
- The API is Chromium-only and may stay that way; the fallback must remain
  first-class, not an afterthought.

**Effort: Small–Medium (1–2 days).** Wrap `fileIO.saveDocument` with the
File System Access path + fallback; add auto-save-on-change (debounced).

---

### 3.5 Option E — Peer-to-Peer (WebRTC)

**Mechanism:** Two browsers connect directly via WebRTC (using a lightweight
signaling channel) and transfer the document. Enables live, real-time
collaboration in the future.

**Strengths**
- **No server for the transfer** — true peer-to-peer.
- **Foundation for real-time collaboration** (Google Docs–style co-editing).

**Weaknesses**
- **High complexity.** Needs signaling (a small server or manual code
          exchange), NAT traversal, ICE, connection-state management, and
          conflict resolution.
- **Both parties must be online simultaneously** — no async "leave a doc for
  me" workflow.
- **Large dependency surface** (`simple-peer` or raw WebRTC + signaling).

**Opportunities**
- Long-term: shared editing, presence cursors, live cursors.

**Threats**
- Far out of scope for "save and share simply." The signaling problem alone
  exceeds the total effort of all other options combined.

**Effort: Large (1–2+ weeks, ongoing).** Not recommended for the current goal.

---

### 3.6 Option F — Free JSON-bin Hosting (External Relay)

**Mechanism:** POST the doc to a free hosted JSON store (e.g. `jsonblob.com`,
`jsonbin.io`), receive a short URL back, share that URL. The recipient's app
GETs the doc from the store.

**Strengths**
- **Short links** — bypasses URL-length limits; works for any doc size.
- **Minimal code** — one `fetch POST`, one `fetch GET`.

**Weaknesses**
- **Privacy.** The user's document sits on a third-party server you don't
  control. Unacceptable for anything sensitive.
- **Reliability.** Free services vanish, rate-limit, or go paid without notice.
  A dead service breaks every shared link.
- **Architecturally inconsistent** with "100% client-side, no backend" — you've
  just outsourced your backend to an unreliable stranger.

**Opportunities**
- Could be an opt-in "pastebin mode" for large docs that don't fit in a URL.

**Threats**
- External dependency with no SLA. If the service dies, shared links break
  permanently.

**Effort: Tiny (½ day)** for the code, but the **risk is the issue**, not the
effort. Not recommended as a primary path.

---

### 3.7 Option G — Companion Sync Server (Minimal Backend)

**Mechanism:** A tiny serverless function (Vercel / Cloudflare Worker / Deno
Deploy) stores docs keyed by a random short code. App `PUT`s the doc, gets a
10-char code back. Another device enters the code and `GET`s it.

**Strengths**
- **Short codes, any doc size.**
- **You control the privacy story** — can encrypt at rest, auto-expire docs,
  no third party.
- **Genuinely simple** — a few dozen lines of serverless code.

**Weaknesses**
- **You now have a backend** — costs, maintenance, a domain, uptime
  responsibility. This is the very thing the userland approach seeks to avoid.
- Still "a thing the developer must set up" — lighter than GCP/Azure, but not
  zero.

**Opportunities**
- Best long-term answer if the app grows to need accounts, history, and
  multi-device sync.

**Threats**
- Scope creep. Once you have a server, users expect accounts, version history,
  multi-doc management, trash, etc.

**Effort: Medium (2–3 days)** for a serverless stub. Recommended as a *future*
phase, not the current default.

---

## 4. Recommendation

### 4.1 The layered share menu

The strongest userland path is **not one option — it's a layered Share menu**
that needs zero accounts and zero developer cloud setup, while keeping the
existing providers as advanced options.

```
┌─────────────────────────────────────┐
│  Share                              │
│                                     │
│  🔗 Copy Link      (Option A)       │  ← primary, works everywhere
│  📤 Share File     (Option B)       │  ← native OS sheet (mobile best)
│  📱 QR Code        (Option C)       │  ← scan to open on another device
│  💾 Save to Folder (Option D)       │  ← File System Access + fallback
│  ─────────────────────────────      │
│  ⚙️  Advanced: Google / OneDrive / S3 │  ← existing providers, opt-in
└─────────────────────────────────────┘
```

**Primary path (Options A + B):** "Copy Link" and "Share File" cover 95% of
use cases with ~1.5 days of work. Link for async sharing; file hand-off for
native mobile sharing.

**Secondary path (Options C + D):** QR codes and folder-save add delight and
power-user workflows for another ~2 days.

**Size guard (critical):** Before encoding, measure the lz-string output. If it
exceeds a threshold (suggested: **30 KB** — well under Safari's ceiling), show:

> "This document is too large to share as a link (42 KB). Share it as a file
> instead, or remove images to shrink it."

This makes the limit *visible and actionable* instead of a silent failure.

### 4.2 What stays, what changes

| Component | Action |
|-----------|--------|
| `CloudStorageModal.tsx` | **Refactor.** Becomes the "Share" modal. Provider selection moves under an "Advanced" collapsible. The default view shows the four userland options. |
| `utils/driveApi.ts`, `driveAuth.ts` | **Keep.** Still available under Advanced → Google Drive. |
| `utils/onedriveApi.ts`, `onedriveAuth.ts` | **Keep.** Still available under Advanced → OneDrive. |
| `utils/s3Api.ts`, `s3Config.ts` | **Keep.** Still available under Advanced → S3. |
| `utils/fileIO.ts` | **Extend.** Add File System Access API path with download fallback. |
| New: `utils/shareUrl.ts` | **Create.** `encodeDocToUrl`, `loadDocFromUrl`, `getSizeEstimate`. |
| New: `utils/webShare.ts` | **Create.** `shareDocument` with feature-detect + fallback. |
| New: `components/layout/ShareMenu.tsx` (or refactor CloudStorageModal) | **Create.** The layered share UI. |

### 4.3 Implementation order

| Step | What | Effort | Cumulative |
|------|------|--------|------------|
| 1 | `shareUrl.ts` — encode / decode / size guard | 1 day | 1 day |
| 2 | "Copy Link" button + startup hash hydration | ½ day | 1.5 days |
| 3 | `webShare.ts` — native share sheet + fallback | ½ day | 2 days |
| 4 | Refactor `CloudStorageModal` → layered Share menu | 1 day | 3 days |
| 5 | QR code option (`qrcode` dep) | 1 day | 4 days |
| 6 | File System Access save + auto-save | 1 day | 5 days |

Steps 1–4 deliver the complete primary path. Steps 5–6 are polish that can ship
later.

### 4.4 Out of scope (future)

- **Option G (companion sync server):** the right call when the app needs
  accounts, version history, or multi-device auto-sync. Not needed to make
  sharing "just work."
- **Option E (WebRTC p2p):** the foundation for real-time collaboration. A
  separate phase entirely.
- **Option F (external JSON-bin):** rejected on privacy and reliability
  grounds.

---

## 5. Open Questions

1. **Size guard threshold.** 30 KB is conservative (safe on Safari). Should we
   be more aggressive (e.g. 50 KB) and accept that a small percentage of Safari
   users with very large docs hit the fallback? → *Recommend 30 KB for v1,
   measure real-world doc sizes, adjust later.*

2. **Auto-save vs. explicit save.** The File System Access API enables
   auto-save (debounced writes to the same handle). Do we want auto-save on by
   default, or explicit "Save" only? → *Recommend explicit Save for v1 (matches
   current mental model); auto-save as a follow-up.*

3. **Link expiration / deletion.** Self-contained links can't be un-shared.
   Is this acceptable for a word processor? → *Recommend yes for v1; a future
   server-backed option (Option G) can add revocation.*

4. **Should the existing cloud providers be hidden by default?** → *Recommend
   they move under an "Advanced" collapsible in the Share modal — still
   accessible, no longer the default.*

---

## 6. Appendix: Effort & Trade-off Matrix

| Option | User setup | Dev setup | Offline | Any size | Cross-device | Effort |
|--------|-----------|-----------|---------|----------|--------------|--------|
| A. URL share | None | None | ✅ | ⚠ small–med | ✅ | **Small** |
| B. Web Share API | None | None | ✅ | ✅ (file) | ✅ | **Tiny** |
| C. QR code | None | None | ✅ | ⚠ small–med | ✅ | **Small** |
| D. File System Access | Sync folder | None | ✅ | ✅ | ⚠ | **Small** |
| E. WebRTC p2p | None | None | ✅ | ✅ | ✅ | **Large** |
| F. JSON-bin host | None | None | ❌ | ✅ | ✅ | **Tiny** ✗ risky |
| G. Sync server | None | Serverless fn | ❌ | ✅ | ✅ | **Medium** |

✅ = yes · ⚠ = partial / conditional · ❌ = no · ✗ = not recommended
