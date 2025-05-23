let selectedFile = null;
let isDarkMode = true;
let isEditing = false;
let originalContent = '';
let folderPath = null;
let selectedFolderPath = '';

// Get DOM elements
const welcomeScreen = document.getElementById('welcome-screen');
const appContent = document.getElementById('app-content');
const welcomeOpenFolderBtn = document.getElementById('welcome-open-folder');

// Function to show/hide welcome screen based on folder selection
function updateAppState() {
  if (folderPath) {
    welcomeScreen.classList.add('hidden');
    appContent.classList.remove('hidden');
  } else {
    welcomeScreen.classList.remove('hidden');
    appContent.classList.add('hidden');
    // Clear editor and file list when showing welcome screen
    editor.value = '';
    originalContent = '';
    currentFile = null;
    isEditing = false;
    saveBtn.classList.remove('has-changes');
    const filesContainer = document.getElementById('files-container');
    filesContainer.innerHTML = '';
    updateSelectedNoteName('');
  }
}

// Handle welcome screen open folder button
welcomeOpenFolderBtn.addEventListener('click', async () => {
  try {
    await window.api.showFolderDialog();
  } catch (error) {
    showNotification('Error opening folder', 'error');
  }
});

// Update the folder selected handler
window.api.onFolderSelected(async (folder) => {
  try {
    folderPath = folder;
    updateAppState();
    const files = await window.api.readFiles();
    updateFileList(files);
    showNotification('Folder opened successfully!', 'success');
  } catch (error) {
    showNotification('Error loading files', 'error');
  }
});

// Handle folder closing
window.api.onFolderClosed(() => {
  folderPath = null;
  updateAppState();
  // Clear editor and file list
  editor.value = '';
  originalContent = '';
  currentFile = null;
  isEditing = false;
  saveBtn.classList.remove('has-changes');
  const filesContainer = document.getElementById('files-container');
  filesContainer.innerHTML = '';
  updateSelectedNoteName('');
});

// Function to update selected note name in top bar
function updateSelectedNoteName(filename) {
    const selectedNoteNameElement = document.getElementById('selected-note-name');
    if (selectedNoteNameElement) {
        selectedNoteNameElement.textContent = filename || '';
    }
}

// Change folder button functionality
const changeFolderBtn = document.getElementById('change-folder-btn');
changeFolderBtn.addEventListener('click', () => {
  currentFolderPath.value = folderPath || 'No folder selected';
  folderManagementModal.classList.remove('hidden');
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
const editor = document.getElementById('editor');
let currentFile = null;

// Track changes in the editor
editor.addEventListener('input', () => {
    if (!currentFile) return;
    
    const hasChanges = editor.value !== originalContent;
    if (hasChanges && !isEditing) {
        isEditing = true;
        saveBtn.classList.add('has-changes');
        showNotification('Changes detected', 'info');
    } else if (!hasChanges && isEditing) {
        isEditing = false;
        saveBtn.classList.remove('has-changes');
    }
});

// Add save button click handler
saveBtn.addEventListener('click', async () => {
    if (!currentFile) {
        showNotification('Please select a note first', 'info');
        return;
    }
    
    try {
        await window.api.saveFile(currentFile, editor.value);
        originalContent = editor.value;
        isEditing = false;
        saveBtn.classList.remove('has-changes');
        showNotification('Changes saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving file:', error);
        showNotification('Error saving changes', 'error');
    }
});

// Delete note functionality
const deleteNoteBtn = document.getElementById('delete-note-btn');

deleteNoteBtn.addEventListener('click', async () => {
    if (!currentFile) {
        showNotification('Please select a note first', 'info');
        return;
    }

    const confirmDelete = confirm(`Are you sure you want to delete "${currentFile}"? This action cannot be undone.`);
    if (!confirmDelete) {
        return;
    }

    try {
        await window.api.deleteFile(currentFile);
        
        // Clear the editor
        editor.value = '';
        originalContent = '';
        currentFile = null;
        isEditing = false;
        saveBtn.classList.remove('has-changes');
        
        // Clear selected note name
        updateSelectedNoteName('');
        
        // Remove selection from file tree
        if (selectedFile) {
            selectedFile.classList.remove('selected');
            selectedFile = null;
        }
        
        // Refresh the file list
        const files = await window.api.readFiles();
        updateFileList(files);
        
        showNotification('Note deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting file:', error);
        showNotification('Error deleting note', 'error');
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
    currentFile = filePath;
    
    // Remove previous selection
    if (selectedFile) {
      selectedFile.classList.remove('selected');
    }
    
    // Update the selected note name
    updateSelectedNoteName(filePath);
    
    // Reset editing state
    isEditing = false;
    saveBtn.classList.remove('has-changes');
    
  } catch (error) {
    console.error('Error loading file:', error);
    showNotification('Error loading file', 'error');
  }
}

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
    
    // Toggle eye icon
    const eyeIcon = previewToggle.querySelector('i');
    eyeIcon.classList.toggle('fa-eye');
    eyeIcon.classList.toggle('fa-eye-slash');
    
    // Update preview if becoming visible
    if (isPreviewVisible) {
      updatePreview();
      showNotification('Preview mode enabled', 'info');
    } else {
      showNotification('Preview mode disabled', 'info');
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
    saveBtn.classList.add('has-changes');
    showNotification('Changes detected', 'info');
  } else if (!hasChanges && isEditing) {
    isEditing = false;
    saveBtn.classList.remove('has-changes');
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

// Add resize observer for chat container
const resizeObserver = new ResizeObserver(entries => {
  for (const entry of entries) {
    const width = entry.contentRect.width;
    document.documentElement.style.setProperty('--chat-width', `${width}px`);
    // Store the width in localStorage for persistence
    localStorage.setItem('chat-width', width);
  }
});

// Start observing the chat container
resizeObserver.observe(chatContainer);

// Restore previous chat width if it exists
const savedWidth = localStorage.getItem('chat-width');
if (savedWidth) {
  chatContainer.style.width = `${savedWidth}px`;
  document.documentElement.style.setProperty('--chat-width', `${savedWidth}px`);
}

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
  editorContainer.classList.toggle('with-chat');
  
  if (isChatOpen) {
    const width = chatContainer.offsetWidth;
    document.documentElement.style.setProperty('--chat-width', `${width}px`);
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

// Clear chat functionality
const clearChatBtn = document.getElementById('clear-chat');
clearChatBtn.addEventListener('click', () => {
  chatMessages.innerHTML = '';
  showNotification('Chat history cleared', 'success');
});

// Export chat functionality
const exportChatBtn = document.getElementById('export-chat');
const exportChatModal = document.getElementById('export-chat-modal');
const exportNoteTitleInput = document.getElementById('export-note-title');
const exportNoteLocationInput = document.getElementById('export-note-location');
const exportBrowseLocationBtn = document.getElementById('export-browse-location');
const exportNotePreview = document.getElementById('export-note-preview');
const saveExportChatBtn = document.getElementById('save-export-chat');
const cancelExportChatBtn = document.getElementById('cancel-export-chat');

// Function to format chat messages as markdown
function formatChatAsMarkdown() {
  const messages = Array.from(chatMessages.children).map(msg => {
    const isUser = msg.classList.contains('user');
    let content = '';
    
    // Handle both plain text and markdown content
    if (msg.classList.contains('markdown-content')) {
      content = msg.innerHTML;
    } else {
      content = msg.textContent;
    }
    
    return `${isUser ? '**You:**' : '**Assistant:**'}\n${content}\n`;
  }).join('\n');

  return messages;
}

// Show export chat modal
exportChatBtn.addEventListener('click', () => {
  const messages = formatChatAsMarkdown();
  
  if (!messages) {
    showNotification('No chat messages to export', 'info');
    return;
  }

  // Set default title with current date
  exportNoteTitleInput.value = `Chat_${new Date().toISOString().split('T')[0]}`;
  exportNoteLocationInput.value = '';
  
  // Show preview
  exportNotePreview.innerHTML = window.api.marked(messages);
  exportNotePreview.dataset.markdown = messages;
  
  // Show modal
  exportChatModal.classList.remove('hidden');
  exportNoteTitleInput.focus();
});

// Browse location button functionality
exportBrowseLocationBtn.addEventListener('click', async () => {
  try {
    const result = await window.api.selectSaveLocation();
    if (result && result.folderPath) {
      exportNoteLocationInput.value = result.folderPath;
    }
  } catch (error) {
    console.error('Error selecting folder:', error);
    showNotification('Error selecting folder', 'error');
  }
});

// Save exported chat
saveExportChatBtn.addEventListener('click', async () => {
  const title = exportNoteTitleInput.value.trim();
  if (!title) {
    showNotification('Please enter a title for the note', 'error');
    return;
  }

  try {
    const fileName = title.endsWith('.md') ? title : `${title}.md`;
    const location = exportNoteLocationInput.value.trim();
    
    // Combine location and filename
    const fullPath = location ? `${location}/${fileName}` : fileName;
    
    // Get the markdown content from the preview
    const content = exportNotePreview.dataset.markdown;
    
    // Create the new file
    const result = await window.api.createNewFile(fullPath, content);
    
    if (result.success) {
      exportChatModal.classList.add('hidden');
      
      // Refresh the file list
      const files = await window.api.readFiles();
      updateFileList(files);
      
      // Load the new file
      await loadFileContent(result.filename);
      
      showNotification('Chat exported as note successfully!', 'success');
    } else {
      showNotification(result.error || 'Failed to export chat', 'error');
    }
  } catch (error) {
    console.error('Error exporting chat:', error);
    showNotification('Error exporting chat', 'error');
  }
});

// Cancel export
cancelExportChatBtn.addEventListener('click', () => {
  exportChatModal.classList.add('hidden');
});

// Close modal when clicking outside
exportChatModal.addEventListener('click', (e) => {
  if (e.target === exportChatModal) {
    exportChatModal.classList.add('hidden');
  }
});

// Handle streaming response
let currentResponseDiv = null;
let currentResponseText = '';

window.api.onChatResponse((event, response) => {
  // Remove loading message if it exists
  const loadingMessage = chatMessages.querySelector('.loading-dots')?.parentElement;
  if (loadingMessage) {
    loadingMessage.remove();
  }
  
  if (response.type === 'stream') {
    if (!currentResponseDiv) {
      currentResponseDiv = document.createElement('div');
      currentResponseDiv.className = 'chat-message assistant markdown-content';
      chatMessages.appendChild(currentResponseDiv);
      currentResponseText = '';
      showNotification('Receiving response from Ollama...', 'info');
    }
    
    currentResponseText += response.content;
    currentResponseDiv.innerHTML = window.api.marked(currentResponseText);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    if (response.done) {
      currentResponseDiv = null;
      currentResponseText = '';
      showNotification('Response completed', 'success');
    }
  } else if (response.type === 'error') {
    showNotification('Ollama error: ' + response.error, 'error');
    currentResponseDiv = null;
    currentResponseText = '';

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

// Chat toggle functionality
const chatToggleBtn = document.getElementById('chat-toggle');
chatToggleBtn.addEventListener('click', () => {
  toggleChat();
});

// Add chat resize observer
const editorContainer = document.querySelector('.editor-container');

if (chatContainer && editorContainer) {
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            const width = entry.contentRect.width;
            document.documentElement.style.setProperty('--chat-width', `${width}px`);
        }
    });

    resizeObserver.observe(chatContainer);
}

// Create note from chat functionality
const createNoteFromChatBtn = document.getElementById('create-note-from-chat');
const createNoteModal = document.getElementById('create-note-from-chat-modal');
const saveNoteFromChatBtn = document.getElementById('save-note-from-chat');
const cancelNoteFromChatBtn = document.getElementById('cancel-note-from-chat');
const noteTitleInput = document.getElementById('note-title');
const noteLocationInput = document.getElementById('note-location');
const browseLocationBtn = document.getElementById('browse-location');
const notePreview = document.getElementById('note-preview');
const loadingSpinner = document.querySelector('.loading-spinner');

// Add folder browse button functionality
browseLocationBtn.addEventListener('click', async () => {
  try {
    const result = await window.api.selectSaveLocation();
    if (result && result.folderPath) {
      noteLocationInput.value = result.folderPath;
    }
  } catch (error) {
    console.error('Error selecting folder:', error);
    showNotification('Error selecting folder', 'error');
  }
});

async function generateNoteFromChat() {
  try {
    // Get Ollama settings first
    const settings = await window.api.getOllamaSettings();
    if (!settings || !settings.url || !settings.model) {
      showNotification('Please configure Ollama settings first', 'error');
      return;
    }

    const chatMessages = document.getElementById('chat-messages');
    const messages = Array.from(chatMessages.children).map(msg => {
      const isUser = msg.classList.contains('user');
      let content = '';
      
      // Handle both plain text and markdown content
      if (msg.classList.contains('markdown-content')) {
        content = msg.innerHTML;
      } else {
        content = msg.textContent;
      }
      
      return {
        role: isUser ? 'user' : 'assistant',
        content: content
      };
    });

    if (messages.length === 0) {
      showNotification('No chat messages to generate note from', 'error');
      return;
    }

    loadingSpinner.classList.remove('hidden');
    notePreview.textContent = '';

    const prompt = `Please create a well-structured markdown note summarizing the following conversation. Include key points, decisions, and important information. Format it with proper headings and sections.

Conversation:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}`;

    const response = await fetch(`${settings.url}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings.model,
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate note');
    }

    const data = await response.json();
    
    // Convert the response to HTML for preview
    const html = window.api.marked(data.response);
    notePreview.innerHTML = html;
    
    // Store the raw markdown for saving later
    notePreview.dataset.markdown = data.response;
    
    showNotification('Note generated successfully!', 'success');
  } catch (error) {
    console.error('Error generating note:', error);
    notePreview.innerHTML = '<div class="error">Error generating note. Please try again.</div>';
    showNotification('Error generating note', 'error');
  } finally {
    loadingSpinner.classList.add('hidden');
  }
}

createNoteFromChatBtn.addEventListener('click', async () => {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages.children.length) {
    showNotification('Cannot create note: Chat history is empty', 'error');
    return;
  }
  
  createNoteModal.classList.remove('hidden');
  noteTitleInput.value = '';
  await generateNoteFromChat();
});

saveNoteFromChatBtn.addEventListener('click', async () => {
  const title = noteTitleInput.value.trim();
  if (!title) {
    showNotification('Please enter a title for the note', 'error');
    return;
  }

  try {
    const fileName = title.endsWith('.md') ? title : `${title}.md`;
    const location = noteLocationInput.value.trim();
    
    // Combine location and filename
    const fullPath = location ? `${location}/${fileName}` : fileName;
    
    // Use the raw markdown stored in the dataset
    const content = notePreview.dataset.markdown || notePreview.textContent;
    
    await window.api.saveFile(fullPath, content);
    createNoteModal.classList.add('hidden');
    showNotification('Note saved successfully!', 'success');
    
    // Refresh the file list
    const files = await window.api.readFiles();
    updateFileList(files);
  } catch (error) {
    console.error('Error saving note:', error);
    showNotification('Error saving note', 'error');
  }
});

cancelNoteFromChatBtn.addEventListener('click', () => {
  createNoteModal.classList.add('hidden');
});

// Close modal when clicking outside
createNoteModal.addEventListener('click', (e) => {
  if (e.target === createNoteModal) {
    createNoteModal.classList.add('hidden');
  }
});

// Floating Assistant
const floatingAssistant = document.getElementById('floating-assistant');
const floatingAssistantToggle = document.getElementById('floating-assistant-toggle');
const minimizeAssistantBtn = document.getElementById('minimize-assistant-btn');
const closeAssistantBtn = document.getElementById('close-assistant-btn');
const floatingChatInput = document.getElementById('floating-chat-input');
const floatingChatMessages = document.getElementById('floating-chat-messages');
const floatingSendChat = document.getElementById('floating-send-chat');

let isFloatingAssistantVisible = false;
let isFloatingAssistantMinimized = false;

// Toggle floating assistant
floatingAssistantToggle.addEventListener('click', () => {
  isFloatingAssistantVisible = !isFloatingAssistantVisible;
  floatingAssistant.classList.toggle('hidden', !isFloatingAssistantVisible);
  if (isFloatingAssistantVisible) {
    floatingChatInput.focus();
  }
});

// Minimize floating assistant
minimizeAssistantBtn.addEventListener('click', () => {
  isFloatingAssistantMinimized = !isFloatingAssistantMinimized;
  floatingAssistant.classList.toggle('minimized', isFloatingAssistantMinimized);
  minimizeAssistantBtn.querySelector('i').classList.toggle('fa-minus');
  minimizeAssistantBtn.querySelector('i').classList.toggle('fa-expand');
});

// Close floating assistant
closeAssistantBtn.addEventListener('click', () => {
  isFloatingAssistantVisible = false;
  floatingAssistant.classList.add('hidden');
});

// Make floating assistant draggable
let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 0;
let yOffset = 0;

const dragStart = (e) => {
  if (e.target.closest('.floating-dialog-header')) {
    isDragging = true;
    const rect = floatingAssistant.getBoundingClientRect();
    
    if (e.type === "mousedown") {
      initialX = e.clientX - rect.left;
      initialY = e.clientY - rect.top;
    } else {
      initialX = e.touches[0].clientX - rect.left;
      initialY = e.touches[0].clientY - rect.top;
    }
  }
};

const dragEnd = () => {
  isDragging = false;
};

const drag = (e) => {
  if (isDragging) {
    e.preventDefault();
    
    let clientX, clientY;
    if (e.type === "mousemove") {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }
    
    const newX = clientX - initialX;
    const newY = clientY - initialY;
    
    // Get window dimensions
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const dialogRect = floatingAssistant.getBoundingClientRect();
    
    // Keep dialog within window bounds
    const maxX = windowWidth - dialogRect.width;
    const maxY = windowHeight - dialogRect.height;
    
    const boundedX = Math.max(0, Math.min(newX, maxX));
    const boundedY = Math.max(0, Math.min(newY, maxY));
    
    floatingAssistant.style.left = boundedX + 'px';
    floatingAssistant.style.top = boundedY + 'px';
    floatingAssistant.style.transform = 'none';
  }
};

floatingAssistant.addEventListener('mousedown', dragStart);
document.addEventListener('mousemove', drag);
document.addEventListener('mouseup', dragEnd);

floatingAssistant.addEventListener('touchstart', dragStart);
document.addEventListener('touchmove', drag);
document.addEventListener('touchend', dragEnd);

// Send message from floating assistant
const sendFloatingChatMessage = async () => {
  const message = floatingChatInput.value.trim();
  if (!message) return;

  try {
    // Check if we have Ollama settings
    const settings = await window.api.getOllamaSettings();
    if (!settings || !settings.url || !settings.model) {
      showNotification('Please configure Ollama settings first', 'error');
      return;
    }

    // Add user message to chat
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'chat-message user';
    userMessageDiv.textContent = message;
    floatingChatMessages.appendChild(userMessageDiv);
    
    // Clear input
    floatingChatInput.value = '';
    
    // Create loading message
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat-message assistant';
    loadingDiv.innerHTML = '<span class="loading-dots"></span>';
    floatingChatMessages.appendChild(loadingDiv);
    floatingChatMessages.scrollTop = floatingChatMessages.scrollHeight;
    
    showNotification('Connecting to Ollama...', 'info');
    
    // Send message to Ollama
    const result = await window.api.sendChatMessage({
      text: message,
      currentContent: ''
    });

    if (!result) {
      throw new Error('Failed to send message to Ollama');
    }
  } catch (error) {
    console.error('Error sending chat message:', error);
    showNotification('Error: ' + (error.message || 'Failed to send message'), 'error');
    
    // Remove loading message if it exists
    const loadingMessage = floatingChatMessages.querySelector('.loading-dots')?.parentElement;
    if (loadingMessage) {
      loadingMessage.remove();
    }

    // Add error message to chat
    const errorDiv = document.createElement('div');
    errorDiv.className = 'chat-message assistant error';
    errorDiv.textContent = '❌ Failed to get response from Ollama. Please check your settings and ensure Ollama is running.';
    floatingChatMessages.appendChild(errorDiv);
    floatingChatMessages.scrollTop = floatingChatMessages.scrollHeight;
  }
};

floatingSendChat.addEventListener('click', sendFloatingChatMessage);

floatingChatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendFloatingChatMessage();
  }
});

// Handle streaming response for floating assistant
let floatingCurrentResponseDiv = null;
let floatingCurrentResponseText = '';

window.api.onChatResponse((event, response) => {
  // Remove loading message if it exists
  const loadingMessage = floatingChatMessages.querySelector('.loading-dots')?.parentElement;
  if (loadingMessage) {
    loadingMessage.remove();
  }
  
  if (response.type === 'stream') {
    if (!floatingCurrentResponseDiv) {
      floatingCurrentResponseDiv = document.createElement('div');
      floatingCurrentResponseDiv.className = 'chat-message assistant markdown-content';
      floatingChatMessages.appendChild(floatingCurrentResponseDiv);
      floatingCurrentResponseText = '';
      showNotification('Receiving response from Ollama...', 'info');
    }
    
    floatingCurrentResponseText += response.content;
    floatingCurrentResponseDiv.innerHTML = window.api.marked(floatingCurrentResponseText);
    floatingChatMessages.scrollTop = floatingChatMessages.scrollHeight;
    
    if (response.done) {
      floatingCurrentResponseDiv = null;
      floatingCurrentResponseText = '';
      showNotification('Response completed', 'success');
    }
  } else if (response.type === 'error') {
    showNotification('Ollama error: ' + response.error, 'error');
    floatingCurrentResponseDiv = null;
    floatingCurrentResponseText = '';

    // Add error message to chat
    const errorDiv = document.createElement('div');
    errorDiv.className = 'chat-message assistant error';
    errorDiv.textContent = '❌ ' + response.error;
    floatingChatMessages.appendChild(errorDiv);
    floatingChatMessages.scrollTop = floatingChatMessages.scrollHeight;
  }
});

// Folder management modal functionality
const folderManagementModal = document.getElementById('folder-management-modal');
const currentFolderPath = document.getElementById('current-folder-path');
const browseNewFolderBtn = document.getElementById('browse-new-folder');
const closeFolderBtn = document.getElementById('close-folder');
const closeFolderDialogBtn = document.getElementById('close-folder-dialog');

// Show folder management modal when change folder button is clicked
changeFolderBtn.addEventListener('click', () => {
  currentFolderPath.value = folderPath || 'No folder selected';
  folderManagementModal.classList.remove('hidden');
});

// Close folder management modal
closeFolderDialogBtn.addEventListener('click', () => {
  folderManagementModal.classList.add('hidden');
});

// Browse for new folder
browseNewFolderBtn.addEventListener('click', async () => {
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
    folderManagementModal.classList.add('hidden');
  } catch (error) {
    showNotification('Error changing folder', 'error');
  }
});

// Close current folder
closeFolderBtn.addEventListener('click', async () => {
  if (isEditing) {
    const confirmClose = confirm('You have unsaved changes. Do you want to close the folder without saving?');
    if (!confirmClose) {
      return;
    }
  }

  // Clear everything
  folderPath = null;
  selectedFolderPath = '';
  editor.value = '';
  originalContent = '';
  currentFile = null;
  isEditing = false;
  saveBtn.classList.remove('has-changes');
  
  // Clear selected note name
  updateSelectedNoteName('');
  
  // Clear file list
  const filesContainer = document.getElementById('files-container');
  filesContainer.innerHTML = '';
  
  // Update current folder path display
  currentFolderPath.value = 'No folder selected';
  
  // Clear stored folder path
  await window.api.clearFolderPath();
  
  // Hide the modal
  folderManagementModal.classList.add('hidden');
  
  showNotification('Folder closed', 'info');
});

// Update folder path in modal when folder is selected
window.api.onFolderSelected((folder) => {
  currentFolderPath.value = folder;
  folderPath = folder;
});
  