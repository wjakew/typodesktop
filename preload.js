const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  onFolderSelected: (callback) => ipcRenderer.on('folder-selected', (event, path) => callback(path)),
  showFolderDialog: () => ipcRenderer.invoke('show-folder-dialog'),
  readFiles: () => ipcRenderer.invoke('read-files'),
  loadFileByPath: (path) => ipcRenderer.invoke('load-file-by-path', path),
  saveFile: (filename, content) => ipcRenderer.invoke('save-file', filename, content),
  renameFile: (oldFilename, newFilename) => ipcRenderer.invoke('rename-file', oldFilename, newFilename),
  createNewFile: (filename) => ipcRenderer.invoke('create-new-file', filename),
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close')
});
