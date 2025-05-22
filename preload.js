const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  onFolderSelected: (callback) => ipcRenderer.on('folder-selected', (e, path) => callback(path)),
  readFiles: () => ipcRenderer.invoke('read-files'),
  loadFile: (filename) => ipcRenderer.invoke('load-file', filename),
  saveFile: (filename, content) => ipcRenderer.invoke('save-file', filename, content),
  createFile: (filename) => ipcRenderer.invoke('create-new-file', filename),
  showFolderDialog: () => ipcRenderer.invoke('show-folder-dialog')
});
