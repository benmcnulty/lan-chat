# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LAN Chat is a lightweight web-based conversational interface for interacting with AI models running on local networks. The project is built with vanilla HTML, CSS, and JavaScript (no frameworks) to maintain simplicity and minimize dependencies.

**Core Purpose**: Provide a clean, minimal starting point for local AI chat with dynamic model selection and personality profiles.

## Architecture

This is a simple client-side web application with three main files:

- `index.html` - Main chat interface and UI structure
- `styles.css` - Responsive styling and layout  
- `app.js` - Core application logic for server connections, model management, chat handling, and personality profiles

The application connects to local AI servers (initially Ollama with `gpt-oss` model) and dynamically discovers available models through API calls.

## Development Commands

Since this is a vanilla web project with no build system:

- **Run locally**: Open `index.html` directly in a web browser (file:// protocol)
- **Serve with HTTP server**: Use any static file server like `python -m http.server` or `npx serve`
- **No build step required**: All files are served directly
- **No package manager**: No npm, yarn, or other package management needed
- **No testing framework**: Testing would be manual in-browser testing

## Key Implementation Details

- **Target AI Server**: Designed primarily for Ollama servers but extensible to other local AI services
- **Storage**: Uses browser localStorage for personality profiles and settings
- **API Pattern**: RESTful calls to discover models and stream chat responses
- **UI Approach**: Simple DOM manipulation without frameworks
- **Responsive Design**: Mobile-friendly interface using CSS Grid/Flexbox

## Current Status

This is an initial project setup. The core files (index.html, styles.css, app.js) exist but are currently empty placeholder files. Implementation should follow the roadmap outlined in README.md.