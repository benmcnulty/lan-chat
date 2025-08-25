# Copilot instructions for LAN Chat

Purpose: help AI coding agents be productive in this repo. Keep it simple, vanilla, and incremental per README.

Project snapshot
- Stack: static HTML + CSS + JavaScript (no frameworks, no build step).
- Entry points: `index.html` (UI), `styles.css` (light styling), `app.js` (all client logic). Files currently exist and are mostly empty.
- Run: open `index.html` directly, or serve statically to avoid CORS/null-origin quirks.

Dev workflows
- Recommended local server (any simple static server works):
  - Python: python3 -m http.server 8080
  - VS Code: Live Server extension
- Target backend: an Ollama server on LAN (default: http://localhost:11434). Ensure it’s running and the `gpt-oss` model is available.

Architecture and data flow (client-only)
- Single-page app. Flow: user input → `fetch` to Ollama → stream tokens → append to chat.
- Dynamic model list from Ollama → populate a dropdown.
- Personality profiles are client-side only (persist in `localStorage`).

Ollama integration (HTTP API)
- List models for dropdown: GET {BASE}/api/tags → { models: [{ name, ... }] }.
- Chat (preferred): POST {BASE}/api/chat with JSON:
  { model, messages:[{role:'system'|'user'|'assistant', content}], stream:true }
  Response is NDJSON (one JSON object per line). Accumulate `message.content` (or `content`) until `done:true`.
- Fallback (non-chat): POST {BASE}/api/generate with { model, prompt, stream:true }.

Conventions to follow when adding code
- Keep everything in `app.js` initially with a single `init()` run on DOMContentLoaded. Use small, named helpers (e.g., `loadModels()`, `sendMessage()`, `streamChat()`).
- Persist small bits of state in `localStorage` under clear keys: `lanChat.serverUrl`, `lanChat.lastModel`, `lanChat.profiles` (array of { name, systemPrompt, defaults? }).
- Streaming: use `AbortController` to support a Stop button; parse NDJSON line-by-line via `ReadableStream` reader.
- UI hooks: prefer predictable IDs in `index.html` like `serverUrl`, `modelSelect`, `profileSelect`, `messages`, `chatForm`, `chatInput`, `sendBtn`, `stopBtn`.
- Defaults: model `gpt-oss`; base URL from input or `localStorage`, fallback to `http://localhost:11434`.

Minimal examples (patterns to replicate)
- Load models: fetch(`${base}/api/tags`).then(r=>r.json()).then(d=>d.models.map(m=>m.name))
- Chat payload shape: { model, messages:[{role:'system',content:sys},{role:'user',content:user}], stream:true }

Testing and debugging
- Smoke tests in the browser: (1) models dropdown populates; (2) send “Hello” and see a streamed response; (3) Stop button cancels without console errors.
- Common pitfalls: CORS with `file://` origin → use a static server; mixed content if accessing non-HTTPS hosts from secure origins.

Repo decisions (keep consistent)
- No frameworks or bundlers; keep DOM and network code straightforward; small modules only if/when needed.
- Keep UI minimal and responsive; avoid heavy dependencies.

If anything above conflicts with your implementation needs (e.g., different default model/server), open a short PR note at the top of `README.md` and update this file accordingly.
