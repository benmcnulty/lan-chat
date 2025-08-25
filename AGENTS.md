# Repository Guidelines

## Project Structure & Module Organization
- `index.html`: Single-page UI for LAN chat.
- `styles.css`: Lightweight, responsive styles.
- `app.js`: Core logic (model discovery, requests, UI wiring).
- No build system or package manager; files load directly in the browser.

## Build, Test, and Development Commands
- Run locally: `python3 -m http.server 8000` then open `http://localhost:8000/`.
- Alternative: `npx serve` (if Node is installed).
- No build step required; update files and refresh the browser.

## Coding Style & Naming Conventions
- Indentation: 2 spaces; UTF-8; LF line endings.
- JavaScript: camelCase functions/vars, PascalCase classes, UPPER_SNAKE_CASE constants.
- Files: lowercase, short, and descriptive (e.g., `app.js`, `styles.css`).
- CSS: use `--lc-*` CSS variables for theme tokens; prefer flex/grid; mobile-first.
- Lint/format: keep simple; if using tools locally, prefer Prettier defaults.

## Testing Guidelines
- Framework: none yet; prioritize manual smoke tests:
  - Load page, select a model, send a message, receive a response.
  - Refresh: confirm state persists as intended (e.g., selected model/profile).
- If you add unit tests, place them under `test/` mirroring `app.js` functions.

## Commit & Pull Request Guidelines
- Commits: concise imperative subject (50 chars max) + context body when useful.
  - Examples: `feat: add model dropdown population`, `fix: handle empty server URL`.
- PRs: include purpose, linked issues, screenshots/GIFs of UI behavior, and steps to verify.
- Scope: prefer small, focused PRs; avoid unrelated refactors.
- Before opening: run locally, test core flows, and update README if user-facing behavior changes.

## Security & Configuration Tips
- Server URLs and model names may be LAN-specific; avoid hardcoding private addresses.
- Be mindful of CORS for local AI servers (e.g., Ollama); document required flags.
- Store minimal state in `localStorage`; avoid secrets in client-side code.

## Architecture Overview
- Plain HTML/CSS/JS SPA. `app.js` wires UI events and calls local AI endpoints.
- Network assumptions: connects to an Ollama-compatible server on your LAN.
- Future growth: modularize `app.js` into smaller files and introduce light tests as needed.

