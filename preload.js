const { contextBridge, ipcRenderer } = require('electron');
const { marked } = require('marked');

// Configure marked
marked.use({
  gfm: true, // GitHub Flavored Markdown
  breaks: true, // Convert line breaks to <br>
  mangle: false, // Don't escape HTML
  headerIds: true, // Add IDs to headers
  headerPrefix: '', // No prefix for header IDs
  smartypants: true, // Use smart punctuation
  xhtml: true // Use XHTML style tags
});

// Create the API object
const api = {
  onFolderSelected: (callback) => ipcRenderer.on('folder-selected', (event, path) => callback(path)),
  onFolderClosed: (callback) => ipcRenderer.on('folder-closed', () => callback()),
  showFolderDialog: () => ipcRenderer.invoke('show-folder-dialog'),
  selectSaveLocation: () => ipcRenderer.invoke('select-save-location'),
  readFiles: () => ipcRenderer.invoke('read-files'),
  loadFileByPath: (path) => ipcRenderer.invoke('load-file-by-path', path),
  saveFile: (filename, content) => ipcRenderer.invoke('save-file', filename, content),
  deleteFile: (filename) => ipcRenderer.invoke('delete-file', filename),
  renameFile: (oldFilename, newFilename) => ipcRenderer.invoke('rename-file', oldFilename, newFilename),
  createNewFile: (filePath, content) => ipcRenderer.invoke('create-new-file', filePath, content),
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  // Markdown rendering
  marked: (text) => marked.parse(text, { async: false }),
  // Ollama Settings
  saveOllamaSettings: (settings) => ipcRenderer.invoke('save-ollama-settings', settings),
  getOllamaSettings: () => ipcRenderer.invoke('get-ollama-settings'),
  // Chat
  sendChatMessage: (message) => ipcRenderer.invoke('send-chat-message', message),
  // Subscribe to streaming response
  onChatResponse: (callback) => {
    ipcRenderer.on('chat-response', callback);
    return () => {
      ipcRenderer.removeListener('chat-response', callback);
    };
  },
  clearFolderPath: () => ipcRenderer.invoke('clear-folder-path'),
};

// Expose the API to the renderer process
try {
  contextBridge.exposeInMainWorld('api', api);
} catch (error) {
  console.error('Failed to expose API:', error);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});
