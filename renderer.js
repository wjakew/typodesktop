let selectedFile = null;
let isDarkMode = false;
let isEditing = false;
let originalContent = '';
let folderPath = null;

// Theme toggle functionality
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = themeToggle.querySelector('i');

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

// Function to load file content
async function loadFileContent(filename) {
    try {
        const content = await window.api.loadFile(filename);
        originalContent = content;
        editor.value = content;
        currentFile = filename;
        
        // Reset editing state
        isEditing = false;
        saveBtn.classList.remove('visible');
        saveBtn.classList.add('hidden');
        
        return true;
    } catch (error) {
        showNotification('Error loading file: ' + filename, 'error');
        return false;
    }
}

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
        
        console.log('Attempting to create file:', filename);
        const result = await window.api.createFile(filename);
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
            
            // Select the new file in the list
            const fileItems = document.querySelectorAll('.file-item');
            let fileFound = false;
            fileItems.forEach(item => {
                if (item.querySelector('span').textContent === result.filename) {
                    if (selectedFile) {
                        selectedFile.classList.remove('selected');
                    }
                    item.classList.add('selected');
                    selectedFile = item;
                    fileFound = true;
                }
            });
            
            if (fileFound) {
                showNotification('New note created successfully!', 'success');
            } else {
                console.error('Created file not found in list');
                showNotification('Note created but not found in list', 'error');
            }
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

// Helper function to update file list
function updateFileList(files) {
    const list = document.getElementById('files-container');
    list.innerHTML = '';
    
    files.forEach(f => {
        const item = document.createElement('div');
        item.className = 'file-item';
        
        // Create icon
        const icon = document.createElement('i');
        icon.className = 'file-icon fas fa-file-alt';
        
        // Create file name span
        const fileName = document.createElement('span');
        fileName.textContent = f;
        
        // Append icon and filename to item
        item.appendChild(icon);
        item.appendChild(fileName);
        
        item.onclick = async () => {
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
            
            // Add selected class to current item
            item.classList.add('selected');
            selectedFile = item;
            
            // Load the file content
            await loadFileContent(f);
        };
        
        list.appendChild(item);
    });
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
  