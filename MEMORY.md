
## User Workflow Conventions

- **"Bugfix:"** prefix → Add bug to `BUGFIX.md` (with ID, description, fix) AND implement the fix
- **"enhancement:"** or new feature requests → Add to `PLAN.md` (new phase or backlog item) AND implement
- Always update the relevant tracking document alongside code changes

## Chatbot Integration (LM Studio — OpenAI-compatible API) — COMPLETE ✅

**2026-08-03** — Integrated LM Studio chatbot using OpenAI-compatible REST API.

### Files Created
- `src/types/chat.ts` — ChatMessage, ModelInfo, ChatConfig, API request/response types
- `src/utils/chatService.ts` — API client using OpenAI-compatible endpoints
- `src/store/useChatStore.ts` — Zustand store with localStorage persistence, token counting, context trimming
- `src/components/layout/ChatPanel.tsx` — Sidebar chat UI with model selector, connection status, bidirectional button

### Files Modified
- `src/store/useDocStore.ts` — Added `chatOpen`/`setChatOpen` state
- `src/App.tsx` — Added ChatPanel to layout, wrapped editor+chat in flex row
- `src/components/layout/Toolbar/Toolbar.tsx` — Added MessageSquare toggle button

### API Endpoints Used
- `POST /v1/chat/completions` — Chat completion (OpenAI-compatible)
- `GET  /v1/models` — List available models (OpenAI-compatible)
- `POST /api/v1/models/load` — Load model (LM Studio native)
- `POST /api/v1/models/unload` — Unload model (LM Studio native)

### Key Features
- Healthcheck via GET /v1/models with connection status indicator
- Model selector dropdown populated from API (default: google/gemma-4-e2b)
- Session memory persisted to localStorage (SIMPLEDOCS_CHAT_STATE)
- Context window: 65535 max tokens with heuristic trimming (4 chars/token)
- Bi-directional button: editor selection (≤200 chars) → chat input; else → insert last response at cursor
- Settings panel: base URL, temperature, system prompt configurable
- CORS requirement documented in code comments

### Test Results
- 257 total tests pass (17 test files)
- 98 new tests across 5 files:
  - chatService.test.ts (19), useChatStore.test.ts (18), ChatPanel.test.tsx (18), markdownToHtml.test.ts (33), promptTemplates.test.ts (10)
- Type-check clean, build succeeds, lint clean (1 pre-existing any in Toolbar)

## System Prompt Templates — COMPLETE ✅

**2026-08-03** — Added system prompt template management to chatbot settings.

### Files Created
- `src/types/promptTemplate.ts` — PromptTemplate interface
- `src/utils/promptTemplates.ts` — Template storage (localStorage), default templates, CRUD helpers
- `src/utils/promptTemplates.test.ts` — 10 tests for template loading, saving, creation

### Files Modified
- `src/components/layout/ChatPanel.tsx` — Added template selector dropdown, new/edit/save/delete UI

### Pre-populated Templates
1. **General Assistant** — Default helpful writing assistant
2. **Executive Analyst & Summarizer** — Structured document analysis with sections (Overview, Key Takeaways, Actionable Insights, Risks)
3. **Fiction Editor & Narrative Coach** — Fiction analysis with sections (Narrative Overview, Character Psychology, Plot Architecture, World-Building, Voice & Style, Blind Spots)

### Features
- Template selector dropdown in Settings panel
- Create new templates with name + content editor
- Edit existing templates
- Delete custom templates (default protected)
- Templates persisted to localStorage (SIMPLEDOCS_CHAT_TEMPLATES)
- Selecting a template updates the active system prompt
