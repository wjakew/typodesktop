let selectedFile = null;
let isDarkMode = true;
let isEditing = false;
let originalContent = '';
let folderPath = null;
let selectedFolderPath = '';

// Function to update selected note name in top bar
function updateSelectedNoteName(filename) {
    const selectedNoteNameElement = document.getElementById('selected-note-name');
    if (selectedNoteNameElement) {
        selectedNoteNameElement.textContent = filename || '';
    }
}

// Change folder button functionality
const changeFolderBtn = document.getElementById('change-folder-btn');
changeFolderBtn.addEventListener('click', async () => {
    // Check if there are unsaved changes
    if (isEditing) {
        const confirmSwitch = confirm('You have unsaved changes. Do you want to change folders without saving?');
        if (!confirmSwitch) {
            return;
        }
    }
    
    // Clear selected note name when switching folders
    updateSelectedNoteName('');
    
    try {
        await window.api.showFolderDialog();
        // The folder-selected event handler will handle the rest
    } catch (error) {
        showNotification('Error changing folder', 'error');
    }
});

// Theme toggle functionality
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = themeToggle.querySelector('i');

// Set initial theme state
document.documentElement.setAttribute('data-theme', 'dark');
themeIcon.className = 'fas fa-sun';

function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    themeIcon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
}

themeToggle.addEventListener('click', toggleTheme);

// Save button functionality
const saveBtn = document.getElementById('save-btn');
const saveBtnText = document.getElementById('save-btn-text');
const editor = document.getElementById('editor');
let currentFile = null;

// Track changes in the editor
editor.addEventListener('input', () => {
    if (!currentFile) return;
    
    const hasChanges = editor.value !== originalContent;
    if (hasChanges && !isEditing) {
        isEditing = true;
        saveBtn.classList.remove('hidden');
        saveBtn.classList.add('visible');
        saveBtnText.textContent = 'Update';
    } else if (!hasChanges && isEditing) {
        isEditing = false;
        saveBtn.classList.remove('visible');
        saveBtn.classList.add('hidden');
    }
});

// New file functionality
const newFileBtn = document.getElementById('new-file-btn');
const newFileModal = document.getElementById('new-file-modal');
const newFileNameInput = document.getElementById('new-file-name');
const createFileBtn = document.getElementById('create-file-btn');
const cancelFileBtn = document.getElementById('cancel-file-btn');

// Show modal when new file button is clicked
newFileBtn.addEventListener('click', async () => {
    try {
        // Check if we have a folder selected
        if (!folderPath) {
            console.log('No folder selected, showing folder dialog');
            showNotification('Please select a folder first', 'error');
            await window.api.showFolderDialog();
            return;
        }
        
        console.log('Showing new file modal');
        newFileModal.classList.remove('hidden');
        newFileNameInput.value = '';
        newFileNameInput.focus();
    } catch (error) {
        console.error('Error showing new file modal:', error);
        showNotification('Error showing new file dialog', 'error');
    }
});

// Handle modal close
cancelFileBtn.addEventListener('click', () => {
    newFileModal.classList.add('hidden');
});

// Handle file creation
createFileBtn.addEventListener('click', async () => {
    try {
        const filename = newFileNameInput.value.trim();
        
        if (!filename) {
            showNotification('Please enter a file name', 'error');
            return;
        }
        
        // Create the file in the selected folder or root if no folder is selected
        const filePath = selectedFolderPath ? `${selectedFolderPath}/${filename}` : filename;
        console.log('Attempting to create file:', filePath);
        
        const result = await window.api.createNewFile(filePath);
        console.log('Create file result:', result);
        
        if (result.success) {
            // Hide the modal
            newFileModal.classList.add('hidden');
            
            // Refresh the file list
            const files = await window.api.readFiles();
            console.log('Updated file list:', files);
            updateFileList(files);
            
            // Load the new file
            await loadFileContent(result.filename);
            
            // Find and select the new file in the tree
            const findAndSelectFile = (items, targetPath) => {
                for (const item of items) {
                    const itemContent = item.querySelector('.tree-item-content');
                    // Get the filename from the path by taking the last part after the last slash
                    const targetFilename = targetPath.split('/').pop();
                    if (item.querySelector('.tree-item-name').textContent === targetFilename) {
                        // Remove previous selection
                        if (selectedFile) {
                            selectedFile.classList.remove('selected');
                        }
                        itemContent.classList.add('selected');
                        selectedFile = itemContent;
                        
                        // Expand parent folders
                        let parent = item.parentElement;
                        while (parent && parent.classList.contains('tree-children')) {
                            parent.classList.remove('hidden');
                            const arrow = parent.previousElementSibling.querySelector('.tree-arrow');
                            if (arrow) {
                                arrow.classList.add('rotated');
                            }
                            const folderIcon = parent.previousElementSibling.querySelector('.tree-icon');
                            if (folderIcon) {
                                folderIcon.className = 'fas fa-folder-open tree-icon';
                            }
                            parent = parent.parentElement.parentElement;
                        }
                        return true;
                    }
                    
                    const children = item.querySelector('.tree-children');
                    if (children && findAndSelectFile(children.children, targetPath)) {
                        return true;
                    }
                }
                return false;
            };
            
            const treeItems = document.querySelectorAll('.tree-item');
            findAndSelectFile(treeItems, result.filename);
            
            showNotification('New note created successfully!', 'success');
        } else {
            console.error('Failed to create file:', result.error);
            showNotification(result.error || 'Failed to create new note', 'error');
        }
    } catch (error) {
        console.error('Error in new file creation:', error);
        showNotification('Error creating new note: ' + (error.message || ''), 'error');
    }
});

// Handle Enter key in the input
newFileNameInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        createFileBtn.click();
    } else if (event.key === 'Escape') {
        cancelFileBtn.click();
    }
});

// Helper function to create folder tree item
function createFolderTreeItem(item, level = 0) {
  const treeItem = document.createElement('div');
  treeItem.className = 'tree-item';
  treeItem.style.paddingLeft = `${level * 20}px`;

  const itemContent = document.createElement('div');
  itemContent.className = 'tree-item-content';

  // Create icon
  const icon = document.createElement('i');
  icon.className = item.type === 'directory' 
    ? 'fas fa-folder tree-icon' 
    : 'fas fa-file-alt tree-icon';

  // Create item name span
  const itemName = document.createElement('span');
  itemName.textContent = item.name;
  itemName.className = 'tree-item-name';

  // Add expand/collapse arrow for directories
  if (item.type === 'directory') {
    const arrow = document.createElement('i');
    arrow.className = 'fas fa-chevron-right tree-arrow';
    itemContent.appendChild(arrow);

    const children = document.createElement('div');
    children.className = 'tree-children hidden';

    // Add click handler for directories
    itemContent.onclick = (e) => {
      e.stopPropagation();
      arrow.classList.toggle('rotated');
      children.classList.toggle('hidden');
      icon.className = children.classList.contains('hidden') 
        ? 'fas fa-folder tree-icon'
        : 'fas fa-folder-open tree-icon';
      
      // Update selected folder path when clicking on a directory
      selectedFolderPath = item.path;
    };

    // Create child items
    item.children.forEach(child => {
      children.appendChild(createFolderTreeItem(child, level + 1));
    });

    treeItem.appendChild(itemContent);
    treeItem.appendChild(children);
  } else {
    // Add click handler for files
    itemContent.onclick = async () => {
      // Check if there are unsaved changes
      if (isEditing) {
        const confirmSwitch = confirm('You have unsaved changes. Do you want to switch files without saving?');
        if (!confirmSwitch) {
          return;
        }
      }

      // Remove selected class from previous selection
      if (selectedFile) {
        selectedFile.classList.remove('selected');
      }
      selectedFile = itemContent;
      itemContent.classList.add('selected');
      
      // Update selected note name in top bar
      updateSelectedNoteName(item.name);

      // Load file content
      await loadFileContent(item.path);
    };

    treeItem.appendChild(itemContent);
  }

  itemContent.appendChild(icon);
  itemContent.appendChild(itemName);

  return treeItem;
}

// Helper function to update file list
function updateFileList(files) {
  const list = document.getElementById('files-container');
  list.innerHTML = '';
  
  files.forEach(item => {
    list.appendChild(createFolderTreeItem(item));
  });
}

// Function to load file content
async function loadFileContent(filePath) {
  try {
    const content = await window.api.loadFileByPath(filePath);
    editor.value = content;
    originalContent = content;
    updatePreview();  // Update preview when loading new file
    
    // Remove previous selection
    if (selectedFile) {
      selectedFile.classList.remove('selected');
    }
    
    // Update the selected note name
    updateSelectedNoteName(filePath);
    
    // Reset editing state
    isEditing = false;
    saveBtn.classList.remove('visible');
    saveBtn.classList.add('hidden');
    
  } catch (error) {
    console.error('Error loading file:', error);
    showNotification('Error loading file', 'error');
  }
}

// Update the folder selected handler
window.api.onFolderSelected(async (folder) => {
    try {
        folderPath = folder;
        const files = await window.api.readFiles();
        updateFileList(files);
    } catch (error) {
        showNotification('Error loading files', 'error');
    }
});

// Save functionality
saveBtn.addEventListener('click', async () => {
    if (!currentFile) {
        showNotification('Please select a file first', 'error');
        return;
    }
    
    try {
        const newContent = editor.value;
        await window.api.saveFile(currentFile, newContent);
        originalContent = newContent;
        isEditing = false;
        saveBtn.classList.remove('visible');
        saveBtn.classList.add('hidden');
        showNotification('File updated successfully!', 'success');
    } catch (error) {
        showNotification('Error saving file', 'error');
    }
});

// Notification function
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.backgroundColor = 
      type === 'success' ? '#40c057' : 
      type === 'error' ? '#fa5252' :
      type === 'info' ? '#228be6' : '#40c057';
    notification.style.color = 'white';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '6px';
    notification.style.animation = 'fadeInOut 2s forwards';
    notification.style.zIndex = '9999';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
}

// Add CSS animation for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(20px); }
        20% { opacity: 1; transform: translateY(0); }
        80% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-20px); }
    }
`;
document.head.appendChild(style);

// Window control event listeners
const minimizeBtn = document.getElementById('minimize-btn');
const maximizeBtn = document.getElementById('maximize-btn');
const closeBtn = document.getElementById('close-btn');
const maximizeIcon = maximizeBtn.querySelector('i');

minimizeBtn.addEventListener('click', () => {
    window.api.minimizeWindow();
});

maximizeBtn.addEventListener('click', () => {
    maximizeIcon.classList.toggle('fa-expand');
    maximizeIcon.classList.toggle('fa-compress');
    window.api.maximizeWindow();
});

closeBtn.addEventListener('click', () => {
    window.api.closeWindow();
});

// Add double-click handler for titlebar to toggle maximize
document.querySelector('.titlebar-drag').addEventListener('dblclick', () => {
    maximizeIcon.classList.toggle('fa-expand');
    maximizeIcon.classList.toggle('fa-compress');
    window.api.maximizeWindow();
});

// Add preview toggle functionality
const previewToggle = document.getElementById('preview-toggle');
const previewContainer = document.getElementById('preview');
const editorWrapper = document.querySelector('.editor-wrapper');
let isPreviewVisible = false;

// Function to update preview content
function updatePreview() {
  if (!isPreviewVisible) return;
  try {
    const markdown = editor.value || '';
    const html = window.api.marked(markdown);
    previewContainer.innerHTML = html;
  } catch (error) {
    console.error('Error updating preview:', error);
    showNotification('Error updating preview', 'error');
  }
}

// Toggle preview visibility
previewToggle.addEventListener('click', () => {
  try {
    isPreviewVisible = !isPreviewVisible;
    previewContainer.classList.toggle('hidden');
    editorWrapper.classList.toggle('split');
    previewToggle.querySelector('i').classList.toggle('fa-eye-slash');
    
    if (isPreviewVisible) {
      updatePreview();
    }
  } catch (error) {
    console.error('Error toggling preview:', error);
    showNotification('Error toggling preview', 'error');
  }
});

// Update preview on editor changes
editor.addEventListener('input', () => {
  updatePreview();
  
  // Keep existing change tracking code
  if (!currentFile) return;
  
  const hasChanges = editor.value !== originalContent;
  if (hasChanges && !isEditing) {
    isEditing = true;
    saveBtn.classList.remove('hidden');
    saveBtn.classList.add('visible');
    saveBtnText.textContent = 'Update';
  } else if (!hasChanges && isEditing) {
    isEditing = false;
    saveBtn.classList.remove('visible');
    saveBtn.classList.add('hidden');
  }
});

// Ollama Settings
const ollamaSettingsBtn = document.getElementById('ollama-settings-btn');
const ollamaSettingsModal = document.getElementById('ollama-settings-modal');
const ollamaUrlInput = document.getElementById('ollama-url');
const ollamaModelInput = document.getElementById('ollama-model');
const saveOllamaSettingsBtn = document.getElementById('save-ollama-settings');
const cancelOllamaSettingsBtn = document.getElementById('cancel-ollama-settings');

// Chat Interface
const chatContainer = document.getElementById('chat-container');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat');
let isChatOpen = false;

// Load Ollama settings
async function loadOllamaSettings() {
  const settings = await window.api.getOllamaSettings();
  ollamaUrlInput.value = settings.url;
  ollamaModelInput.value = settings.model;
}

// Show Ollama settings modal
ollamaSettingsBtn.addEventListener('click', () => {
  loadOllamaSettings();
  ollamaSettingsModal.classList.remove('hidden');
});

// Save Ollama settings
saveOllamaSettingsBtn.addEventListener('click', async () => {
  const settings = {
    url: ollamaUrlInput.value.trim(),
    model: ollamaModelInput.value.trim()
  };
  
  if (!settings.url || !settings.model) {
    showNotification('Please fill in all fields', 'error');
    return;
  }
  
  const success = await window.api.saveOllamaSettings(settings);
  if (success) {
    ollamaSettingsModal.classList.add('hidden');
    showNotification('Settings saved successfully!', 'success');
  } else {
    showNotification('Failed to save settings', 'error');
  }
});

// Cancel Ollama settings
cancelOllamaSettingsBtn.addEventListener('click', () => {
  ollamaSettingsModal.classList.add('hidden');
});

// Toggle chat interface
ollamaSettingsBtn.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  toggleChat();
});

function toggleChat() {
  isChatOpen = !isChatOpen;
  chatContainer.classList.toggle('hidden');
  document.querySelector('.editor-container').classList.toggle('with-chat');
  
  if (isChatOpen) {
    chatInput.focus();
  }
}

// Handle chat messages
function addChatMessage(message, isUser = true) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${isUser ? 'user' : 'assistant'}`;
  messageDiv.textContent = message;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Send chat message
async function sendChatMessage() {
  const message = chatInput.value.trim();
  if (!message) return;
  
  try {
    // Check if we have Ollama settings
    const settings = await window.api.getOllamaSettings();
    if (!settings || !settings.url || !settings.model) {
      showNotification('Please configure Ollama settings first', 'error');
      return;
    }

    // Add user message to chat
    addChatMessage(message, true);
    
    // Clear input
    chatInput.value = '';
    
    // Get current note content
    const currentContent = editor.value;
    
    // Create loading message
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat-message assistant';
    loadingDiv.innerHTML = '<span class="loading-dots"></span>';
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    showNotification('Connecting to Ollama...', 'info');
    
    // Send message to Ollama
    const result = await window.api.sendChatMessage({
      text: message,
      currentContent: currentContent
    });

    if (!result) {
      throw new Error('Failed to send message to Ollama');
    }
  } catch (error) {
    console.error('Error sending chat message:', error);
    showNotification('Error: ' + (error.message || 'Failed to send message'), 'error');
    
    // Remove loading message if it exists
    const loadingMessage = chatMessages.querySelector('.loading-dots')?.parentElement;
    if (loadingMessage) {
      loadingMessage.remove();
    }

    // Add error message to chat
    const errorDiv = document.createElement('div');
    errorDiv.className = 'chat-message assistant error';
    errorDiv.textContent = '❌ Failed to get response from Ollama. Please check your settings and ensure Ollama is running.';
    chatMessages.appendChild(errorDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

// Handle chat input
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
});

sendChatBtn.addEventListener('click', sendChatMessage);

// Handle streaming response
let currentResponseDiv = null;

window.api.onChatResponse((event, response) => {
  // Remove loading message if it exists
  const loadingMessage = chatMessages.querySelector('.loading-dots')?.parentElement;
  if (loadingMessage) {
    loadingMessage.remove();
  }
  
  if (response.type === 'stream') {
    if (!currentResponseDiv) {
      currentResponseDiv = document.createElement('div');
      currentResponseDiv.className = 'chat-message assistant';
      chatMessages.appendChild(currentResponseDiv);
      showNotification('Receiving response from Ollama...', 'info');
    }
    
    currentResponseDiv.textContent += response.content;
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    if (response.done) {
      currentResponseDiv = null;
      showNotification('Response completed', 'success');
    }
  } else if (response.type === 'error') {
    showNotification('Ollama error: ' + response.error, 'error');
    currentResponseDiv = null;

    // Add error message to chat
    const errorDiv = document.createElement('div');
    errorDiv.className = 'chat-message assistant error';
    errorDiv.textContent = '❌ ' + response.error;
    chatMessages.appendChild(errorDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } else if (response.type === 'end') {
    if (!currentResponseDiv) {
      showNotification('No response received from Ollama', 'error');
      
      // Add error message to chat
      const errorDiv = document.createElement('div');
      errorDiv.className = 'chat-message assistant error';
      errorDiv.textContent = '❌ No response received. Please check if Ollama is running and the model is properly loaded.';
      chatMessages.appendChild(errorDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }
});
  