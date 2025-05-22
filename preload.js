const { contextBridge, ipcRenderer } = require('electron');
const marked = require('marked');

// Create the API object
const api = {
  onFolderSelected: (callback) => ipcRenderer.on('folder-selected', (event, path) => callback(path)),
  showFolderDialog: () => ipcRenderer.invoke('show-folder-dialog'),
  readFiles: () => ipcRenderer.invoke('read-files'),
  loadFileByPath: (path) => ipcRenderer.invoke('load-file-by-path', path),
  saveFile: (filename, content) => ipcRenderer.invoke('save-file', filename, content),
  renameFile: (oldFilename, newFilename) => ipcRenderer.invoke('rename-file', oldFilename, newFilename),
  createNewFile: (filePath) => ipcRenderer.invoke('create-new-file', filePath),
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  // Markdown rendering
  marked: (text) => marked.parse(text)
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
