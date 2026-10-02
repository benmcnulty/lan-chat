# LAN Chat

An experimental browser chat interface for Ollama-compatible models on a local
machine or LAN. The implemented app uses plain HTML, CSS and JavaScript without
a framework, build step or application backend.

## Current implementation

- Configurable server URL and installed-model discovery.
- Streaming chat responses and a conversation held in memory.
- Default and editable personality profiles used as system prompts.
- Light/dark theme, connection status and settings/profile dialogs.
- Browser storage for server settings, profiles and theme.

Other provider adapters, shared multi-user sessions and durable conversation
history remain future work. A model must actually be installed on the chosen
server; the app does not install `gpt-oss` or another model for you.

## Run locally

With Python 3 available:

```sh
git clone https://github.com/benmcnulty/lan-chat.git
cd lan-chat
python -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000` and stop the preview with Ctrl+C. Python serves static
files only. No npm dependencies or environment variables are required.

Run an Ollama-compatible server with an installed model. The app initially tries
`http://localhost:11434`; use Settings to choose another base URL, then select a
discovered model and a personality profile. Send a short, non-sensitive message
to check the connection.

The browser calls that server's `/api/tags` and `/api/chat` directly. The inference
server must allow the preview origin through its own CORS configuration. Opening
`index.html` with `file://` can behave differently; HTTPS pages may also block HTTP
inference URLs. The app provides no server-side proxy or authentication layer.

## Source and limitations

[`index.html`](index.html) is the interface, [`styles.css`](styles.css) defines
presentation/theme tokens, and [`app.js`](app.js) contains the application, server,
chat, personality and UI managers. Settings, profiles and theme use local storage;
conversation messages are held in memory and are lost on a refresh.

Messages and personality instructions are sent to the selected endpoint. Its
operator controls inference privacy and retention. Browser storage is not a
secret store. Keep sensitive data out of prompts and profiles, and review model
responses as untrusted content.

## Verification and contributions

No automated suite or CI workflow is committed. Manual verification should check
model discovery, streaming, an unavailable server, personality create/edit/delete,
theme persistence and refresh behavior. This documentation review inspected the
source; it did not verify a live LAN model, mobile layout or accessibility.

Follow [`AGENTS.md`](AGENTS.md) and include focused changes plus reproducible
verification steps. The original README declares the MIT License; a standalone
`LICENSE` file has not yet been committed.
