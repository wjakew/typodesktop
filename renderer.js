let selectedFile = null;
let isDarkMode = true;
let isEditing = false;
let originalContent = '';
let folderPath = null;
let selectedFolderPath = '';

// Function to update selected note name in top bar
function updateSelectedNoteName(filename) {
    const selectedNoteNameElement = document.getElementById('selected-note-name');
    selectedNoteNameElement.textContent = filename || '';
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
    originalContent = content;
    editor.value = content;
    currentFile = filePath;
    
    // Reset editing state
    isEditing = false;
    saveBtn.classList.remove('visible');
    saveBtn.classList.add('hidden');
    
    return true;
  } catch (error) {
    showNotification('Error loading file: ' + filePath, 'error');
    return false;
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
    notification.style.backgroundColor = type === 'success' ? '#40c057' : '#fa5252';
    notification.style.color = 'white';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '6px';
    notification.style.animation = 'fadeInOut 2s forwards';
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
  