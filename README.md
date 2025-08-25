# LAN Chat

LAN Chat is a lightweight conversational interface for interacting with AI models running on your local network.  
It is designed to start simple—connecting to an Ollama server running `gpt-oss`—but can easily expand to support additional models and servers.

## Features (Initial Scope)
- **Local AI Chat**: Quick conversational interface with the default local model.
- **Dynamic Model Selection**: Detect and display available models from Ollama and other servers via dropdowns.
- **Personality Profiles**: Define, save, and reuse prompted personalities with logical defaults included.
- **Simple UI**: Built entirely with **HTML, CSS, and JavaScript**—no frameworks required.

## Goals
1. Provide a clean and minimal starting point for local AI chat.
2. Allow dynamic configuration of servers and models.
3. Enable experimenting with different personalities while keeping the interface uncluttered.
4. Serve as a foundation for future enhancements (multi-user, persistence, richer UI).

## Planned Structure
- `index.html` → Main chat interface  
- `styles.css` → Lightweight styling, responsive layout  
- `script.js` → Core logic: server connections, dropdown population, chat handling, personality management

## Roadmap
- [ ] Connect to local Ollama server and load `gpt-oss`.
- [ ] Populate model dropdown dynamically.
- [ ] Enable sending messages and receiving responses.
- [ ] Add UI for creating and saving personality profiles.
- [ ] Store/reuse profiles locally (simple JSON or browser storage).
- [ ] Support additional servers beyond Ollama.

## Getting Started
1. Ensure you have [Ollama](https://ollama.ai) installed and running on your LAN.
2. Clone this repo:
   ```bash
   git clone https://github.com/your-username/lan-chat.git
   cd lan-chat
   ```
3. Open `index.html` in your browser.
4. Start chatting with your local AI!

## License
MIT License – open for personal and commercial use.
