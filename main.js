const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let folderPath = null;
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');
  
  // Add keyboard shortcut for DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.key.toLowerCase() === 'i') {
      mainWindow.webContents.openDevTools();
      event.preventDefault();
    }
  });
}

function showFolderDialog() {
  if (!mainWindow) return;
  
  dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  }).then(result => {
    if (!result.canceled) {
      folderPath = result.filePaths[0];
      mainWindow.webContents.send('folder-selected', folderPath);
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  showFolderDialog();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Add handler for showing folder dialog
ipcMain.handle('show-folder-dialog', () => {
  showFolderDialog();
});

ipcMain.handle('read-files', () => {
  if (!folderPath) return [];
  return fs.readdirSync(folderPath).filter(f => f.endsWith('.md'));
});

ipcMain.handle('load-file', (event, filename) => {
  return fs.readFileSync(path.join(folderPath, filename), 'utf-8');
});

ipcMain.handle('save-file', (event, filename, content) => {
  fs.writeFileSync(path.join(folderPath, filename), content);
  return true;
});

ipcMain.handle('rename-file', (event, oldFilename, newFilename) => {
  try {
    // Ensure new filename has .md extension
    const newName = newFilename.endsWith('.md') ? newFilename : `${newFilename}.md`;
    
    // Get full paths
    const oldPath = path.join(folderPath, oldFilename);
    const newPath = path.join(folderPath, newName);
    
    // Read the content of the old file
    const content = fs.readFileSync(oldPath, 'utf-8');
    
    // Write content to new file
    fs.writeFileSync(newPath, content);
    
    // Delete the old file
    fs.unlinkSync(oldPath);
    
    return { success: true, newFilename: newName };
  } catch (error) {
    console.error('Error renaming file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-new-file', (event, filename) => {
  try {
    // Check if folder is selected
    if (!folderPath) {
      return { success: false, error: 'No folder selected' };
    }

    // Validate filename
    if (!filename || typeof filename !== 'string' || filename.trim() === '') {
      return { success: false, error: 'Invalid filename' };
    }

    // Ensure filename has .md extension
    const newName = filename.endsWith('.md') ? filename : `${filename}.md`;
    const filePath = path.join(folderPath, newName);
    
    // Check if file already exists
    if (fs.existsSync(filePath)) {
      return { success: false, error: 'File already exists' };
    }
    
    // Create empty file
    fs.writeFileSync(filePath, '');
    console.log('Created new file:', filePath); // Add logging
    
    return { success: true, filename: newName };
  } catch (error) {
    console.error('Error creating new file:', error);
    return { success: false, error: error.message };
  }
});