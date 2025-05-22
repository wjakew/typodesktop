const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

let folderPath = null;
let mainWindow = null;

// Add error handling for the main process
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});

// Add folder persistence
function getStoredFolderPath() {
  const userDataPath = app.getPath('userData');
  const configPath = path.join(userDataPath, 'config.json');
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config.lastFolder;
    }
  } catch (error) {
    console.error('Error reading stored folder path:', error);
  }
  return null;
}

function saveStoredFolderPath(folderPath) {
  const userDataPath = app.getPath('userData');
  const configPath = path.join(userDataPath, 'config.json');
  try {
    fs.writeFileSync(configPath, JSON.stringify({ lastFolder: folderPath }));
  } catch (error) {
    console.error('Error saving folder path:', error);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
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

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.on('did-finish-load', () => {
    // Try to load stored folder path after window is ready
    folderPath = getStoredFolderPath();
    if (folderPath && fs.existsSync(folderPath)) {
      mainWindow.webContents.send('folder-selected', folderPath);
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
      saveStoredFolderPath(folderPath);
      mainWindow.webContents.send('folder-selected', folderPath);
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  
  // Try to load stored folder path first
  folderPath = getStoredFolderPath();
  if (folderPath && fs.existsSync(folderPath)) {
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents.send('folder-selected', folderPath);
    });
  } else {
    showFolderDialog();
  }

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

// Add handler for selecting save location
ipcMain.handle('select-save-location', async () => {
  if (!mainWindow) return null;
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    defaultPath: folderPath // Start from current folder
  });
  
  if (!result.canceled) {
    const selectedPath = result.filePaths[0];
    // If the selected path is within the root folder, make it relative
    if (selectedPath.startsWith(folderPath)) {
      return { folderPath: path.relative(folderPath, selectedPath) };
    }
    return { folderPath: selectedPath };
  }
  return null;
});

// Function to recursively read directory
function readDirectoryRecursively(dirPath) {
  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  const result = [];

  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);
    const relativePath = path.relative(folderPath, fullPath);
    
    if (item.isDirectory()) {
      result.push({
        type: 'directory',
        name: item.name,
        path: relativePath,
        children: readDirectoryRecursively(fullPath)
      });
    } else if (item.isFile() && item.name.endsWith('.md')) {
      result.push({
        type: 'file',
        name: item.name,
        path: relativePath
      });
    }
  }

  return result;
}

ipcMain.handle('read-files', () => {
  if (!folderPath) return [];
  return readDirectoryRecursively(folderPath);
});

// Add handler for loading file with relative path
ipcMain.handle('load-file-by-path', (event, relativePath) => {
  const fullPath = path.join(folderPath, relativePath);
  return fs.readFileSync(fullPath, 'utf-8');
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

ipcMain.handle('create-new-file', (event, filePath) => {
  try {
    // Check if folder is selected
    if (!folderPath) {
      return { success: false, error: 'No folder selected' };
    }

    // Validate filename
    if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
      return { success: false, error: 'Invalid filename' };
    }

    // Ensure filename has .md extension
    const newName = filePath.endsWith('.md') ? filePath : `${filePath}.md`;
    const fullPath = path.join(folderPath, newName);
    
    // Create parent directories if they don't exist
    const parentDir = path.dirname(fullPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    
    // Check if file already exists
    if (fs.existsSync(fullPath)) {
      return { success: false, error: 'File already exists' };
    }
    
    // Create empty file
    fs.writeFileSync(fullPath, '');
    console.log('Created new file:', fullPath);
    
    return { success: true, filename: newName };
  } catch (error) {
    console.error('Error creating new file:', error);
    return { success: false, error: error.message };
  }
});

// Add window control handlers
ipcMain.handle('window-minimize', () => {
  mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle('window-close', () => {
  mainWindow.close();
});

// Ollama settings storage
function getOllamaSettingsPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'ollama-settings.json');
}

function loadOllamaSettings() {
  const settingsPath = getOllamaSettingsPath();
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading Ollama settings:', error);
  }
  return {
    url: 'http://localhost:11434',
    model: 'llama2'
  };
}

function saveOllamaSettings(settings) {
  const settingsPath = getOllamaSettingsPath();
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Error saving Ollama settings:', error);
    return false;
  }
}

// Ollama API integration
async function streamOllamaResponse(settings, message, currentContent, callback) {
  // Construct the full prompt with context
  const fullPrompt = `You are a private assistant that assists by helping with user notes and knowledge. Your answers are always in English. This is the context:\n${currentContent}\n\nThis is the whole conversation:\n${message.chatHistory || ''}\n\nThis is the current user prompt:\n${message.text}`;

  const requestData = {
    model: settings.model,
    prompt: fullPrompt,
    stream: true
  };

  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const protocol = settings.url.startsWith('https') ? https : http;
  const req = protocol.request(settings.url + '/api/generate', requestOptions, (res) => {
    let buffer = '';

    // Check for HTTP error status codes
    if (res.statusCode !== 200) {
      callback({
        type: 'error',
        error: `Ollama API error (${res.statusCode}): ${res.statusMessage}`
      });
      return;
    }

    res.on('data', (chunk) => {
      buffer += chunk.toString();
      
      // Process complete JSON objects from the stream
      while (true) {
        const newlineIndex = buffer.indexOf('\n');
        if (newlineIndex === -1) break;
        
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        
        try {
          const response = JSON.parse(line);
          if (response.error) {
            callback({
              type: 'error',
              error: response.error
            });
            return;
          }
          callback({
            type: 'stream',
            content: response.response,
            done: response.done
          });
        } catch (error) {
          console.error('Error parsing Ollama response:', error);
          callback({
            type: 'error',
            error: 'Failed to parse Ollama response'
          });
        }
      }
    });

    res.on('end', () => {
      if (buffer.length > 0) {
        try {
          const response = JSON.parse(buffer);
          if (response.error) {
            callback({
              type: 'error',
              error: response.error
            });
            return;
          }
        } catch (error) {
          // Ignore parsing error on last chunk if it's incomplete
        }
      }
      callback({
        type: 'end'
      });
    });
  });

  req.on('error', (error) => {
    console.error('Error in Ollama request:', error);
    callback({
      type: 'error',
      error: `Connection error: ${error.message}`
    });
  });

  try {
    req.write(JSON.stringify(requestData));
    req.end();
  } catch (error) {
    console.error('Error sending request to Ollama:', error);
    callback({
      type: 'error',
      error: `Failed to send request: ${error.message}`
    });
  }
}

// Add IPC handlers for Ollama integration
ipcMain.handle('save-ollama-settings', async (event, settings) => {
  return saveOllamaSettings(settings);
});

ipcMain.handle('get-ollama-settings', async () => {
  return loadOllamaSettings();
});

ipcMain.handle('send-chat-message', async (event, message) => {
  const settings = loadOllamaSettings();
  const currentContent = message.currentContent || '';
  
  streamOllamaResponse(settings, message, currentContent, (response) => {
    if (!mainWindow) return;
    mainWindow.webContents.send('chat-response', response);
  });
  
  return true;
});