# Typo Desktop

A lightweight desktop Markdown editor built with Electron. This application allows you to manage and edit Markdown files in a selected directory with a clean and intuitive interface.

## Features

- 📁 Directory-based file management
- 📝 Create, edit, and rename Markdown files
- 💾 Auto-save functionality
- 🔍 Easy file navigation
- 🎨 Clean and intuitive user interface
- 🚀 Fast and lightweight

## Installation

1. Make sure you have [Node.js](https://nodejs.org/) installed on your system
2. Clone this repository
3. Install dependencies:
```bash
npm install
```

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

## Technical Details

The application uses:
- Electron for the desktop framework
- Node.js for backend operations
- Native file system integration
- IPC (Inter-Process Communication) for secure file operations

## Security

- Context isolation enabled
- Node integration disabled
- Secure IPC communication between main and renderer processes
