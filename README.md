# Typo

typo is a lightweight, local-first application designed to help you build and manage a personalized knowledge base. With full integration of Ollama—which you can host locally—it ensures your data remains entirely private and secure.

Typo provides a clean, intuitive interface for browsing, editing, and organizing Markdown files within a chosen directory. Whether you’re documenting projects, taking notes, or curating research, Typo offers a seamless experience tailored for productivity and privacy.

## Features

- 📁 Directory-based file management
- 📝 Create, edit, and rename Markdown files
- 💾 Auto-save functionality
- 🔍 Easy file navigation
- 🎨 Clean and intuitive user interface
- 🚀 Fast and lightweight
- 🤖 AI-powered assistance with Ollama integration

## Installation

1. Make sure you have [Node.js](https://nodejs.org/) installed on your system
2. Clone this repository
3. Install dependencies:
```bash
npm install
```

or

Download newest release from release page.

## Development

To run the application in development mode:

```bash
npm start
```

### Developer Tools

You can open the Developer Tools by pressing `Ctrl+I` (or `Cmd+I` on macOS) while the application is running.

## Application Structure

- `main.js` - Main Electron process, handles file system operations and window management
- `renderer.js` - Renderer process, manages the UI and user interactions
- `preload.js` - Preload script for secure IPC communication
- `index.html` - Main application HTML
- `style.css` - Application styling

## Features in Detail

### File Management
- Select a working directory for your Markdown files
- Create new Markdown files
- Rename existing files
- Auto-save changes
- Load and edit existing Markdown files

### User Interface
- Clean and modern interface
- Easy file navigation
- Real-time preview (if implemented)
- Responsive design

### AI Integration
- Built-in AI assistant powered by Ollama
- Context-aware responses based on your notes
- Customizable AI model selection
- Configurable Ollama server settings
- Real-time streaming responses
- Chat history support for contextual conversations

## Technical Details

The application uses:
- Electron for the desktop framework
- Node.js for backend operations
- Native file system integration
- IPC (Inter-Process Communication) for secure file operations
- Ollama API integration for AI capabilities
- Streaming response handling for real-time AI interactions

## Security

- Context isolation enabled
- Node integration disabled
- Secure IPC communication between main and renderer processes
