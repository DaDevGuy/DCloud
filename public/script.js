document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('uploadForm');
    const fileInput = document.getElementById('fileInput');
    const fileLabel = document.getElementById('fileLabel');
    const fileList = document.getElementById('fileList');
    const totalSizeElement = document.getElementById('totalSize');
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    if (localStorage.getItem('darkMode') === 'true' || 
        (window.matchMedia('(prefers-color-scheme: dark)').matches && 
         localStorage.getItem('darkMode') === null)) {
        document.body.classList.add('dark-mode');
        darkModeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }
    
    // Toggle dark mode
    darkModeToggle.addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);
        darkModeToggle.innerHTML = isDarkMode ? 
            '<i class="fa-solid fa-sun"></i>' : 
            '<i class="fa-solid fa-moon"></i>';
    });
    
    // Show toast message
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 
            '<i class="fa-solid fa-circle-check"></i>' : 
            '<i class="fa-solid fa-circle-exclamation"></i>';
        
        toast.innerHTML = `${icon} ${message}`;
        document.getElementById('toast-container').appendChild(toast);
        
        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
    
    // Display filename when selected
    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            const fileName = this.files[0].name;
            fileLabel.textContent = fileName.length > 25 ? 
                fileName.substring(0, 22) + '...' : fileName;
        } else {
            fileLabel.textContent = 'Choose a file or drag & drop';
        }
    });
    
    // Drag and drop functionality
    const fileInputLabel = document.querySelector('.file-input-label');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileInputLabel.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        fileInputLabel.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        fileInputLabel.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        fileInputLabel.style.borderColor = 'var(--primary-color)';
        if (document.body.classList.contains('dark-mode')) {
            fileInputLabel.style.backgroundColor = '#2c3555'; // Darker highlight for dark mode
        } else {
            fileInputLabel.style.backgroundColor = '#edf0ff'; // Original highlight for light mode
        }
    }
    
    function unhighlight() {
        fileInputLabel.style.borderColor = '';
        fileInputLabel.style.backgroundColor = '';
    }
    
    fileInputLabel.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        fileInput.files = files;
        
        if (files.length > 0) {
            const fileName = files[0].name;
            fileLabel.textContent = fileName.length > 25 ? 
                fileName.substring(0, 22) + '...' : fileName;
        }
    }
    
    // Gt file icon based on extension
    function getFileIcon(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        
        const iconMap = {
            pdf: 'fa-file-pdf',
            doc: 'fa-file-word', docx: 'fa-file-word',
            xls: 'fa-file-excel', xlsx: 'fa-file-excel',
            ppt: 'fa-file-powerpoint', pptx: 'fa-file-powerpoint',
            jpg: 'fa-file-image', jpeg: 'fa-file-image', png: 'fa-file-image', 
            gif: 'fa-file-image', svg: 'fa-file-image',
            zip: 'fa-file-archive', rar: 'fa-file-archive', '7z': 'fa-file-archive',
            mp3: 'fa-file-audio', wav: 'fa-file-audio',
            mp4: 'fa-file-video', mov: 'fa-file-video', avi: 'fa-file-video',
            txt: 'fa-file-lines', md: 'fa-file-lines',
            js: 'fa-file-code', css: 'fa-file-code', html: 'fa-file-code', 
            json: 'fa-file-code', py: 'fa-file-code', java: 'fa-file-code'
        };
        
        const iconClass = iconMap[extension] || 'fa-file';
        return `<i class="fa-solid ${iconClass} file-icon"></i>`;
    }
    
    // Function to load files
    function loadFiles() {
        NProgress.start();
        
        fetch('/files')
            .then(response => response.json())
            .then(files => {
                fileList.innerHTML = '';
                
                if (files.length === 0) {
                    fileList.innerHTML = `
                        <tr>
                            <td colspan="3">
                                <div class="empty-state">
                                    <div class="empty-state-icon">
                                        <i class="fa-solid fa-folder-open"></i>
                                    </div>
                                    <p>No files uploaded yet</p>
                                </div>
                            </td>
                        </tr>
                    `;
                } else {
                    files.forEach(file => {
                        const row = document.createElement('tr');
                        
                        row.innerHTML = `
                            <td class="file-name">
                                ${getFileIcon(file.filename)}
                                <span class="text-truncate" title="${file.filename}">${file.filename}</span>
                            </td>
                            <td>${file.formattedSize}</td>
                            <td class="action-cell">
                                <button class="btn btn-danger btn-sm delete-btn" data-id="${file.id}" title="Delete">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                                <button class="btn btn-success btn-sm download-btn" data-id="${file.id}" title="Download">
                                    <i class="fa-solid fa-download"></i>
                                </button>
                            </td>
                        `;
                        
                        fileList.appendChild(row);
                    });
                    
                    // Add event listeners to buttons
                    document.querySelectorAll('.delete-btn').forEach(btn => {
                        btn.addEventListener('click', handleDelete);
                    });
                    
                    document.querySelectorAll('.download-btn').forEach(btn => {
                        btn.addEventListener('click', handleDownload);
                    });
                }
                
                NProgress.done();
            })
            .catch(error => {
                console.error('Error loading files:', error);
                fileList.innerHTML = '<tr><td colspan="3">Error loading files</td></tr>';
                NProgress.done();
                showToast('Failed to load files', 'error');
            });
        
        // Update total size
        fetch('/totalsize')
            .then(response => response.json())
            .then(data => {
                totalSizeElement.textContent = `Total File Size: ${data.totalSize}`;
            })
            .catch(error => {
                console.error('Error loading total size:', error);
                totalSizeElement.textContent = 'Total File Size: Error loading';
            });
    }
    
    // Handle file upload
    uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const file = fileInput.files[0];
        
        if (!file) {
            showToast('Please select a file to upload', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        

        const uploadBtn = this.querySelector('button');
        const originalText = uploadBtn.innerHTML;
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';
        

        NProgress.configure({ showSpinner: false });
        NProgress.start();
        
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Upload failed');
            }
            return response.text();
        })
        .then(() => {
            // Reset form
            fileInput.value = '';
            fileLabel.textContent = 'Choose a file or drag & drop';
            uploadBtn.innerHTML = originalText;
            uploadBtn.disabled = false;
            
            // Complete progress
            NProgress.done();
            
            // Show success message
            showToast('File uploaded successfully');
            
            // Refresh file list
            loadFiles();
        })
        .catch(error => {
            console.error('Error uploading file:', error);
            uploadBtn.innerHTML = originalText;
            uploadBtn.disabled = false;
            NProgress.done();
            showToast('Error uploading file', 'error');
        });
    });
    
    // Handle file deletion
    function handleDelete(e) {
        const fileId = this.getAttribute('data-id');
        
        if (confirm('Are you sure you want to delete this file?')) {
            // Show loader
            this.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            this.disabled = true;
            NProgress.start();
            
            fetch(`/file/${fileId}`, {
                method: 'DELETE'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Delete failed');
                }
                return response.json();
            })
            .then(() => {
                NProgress.done();
                showToast('File deleted successfully');
                loadFiles();
            })
            .catch(error => {
                console.error('Error deleting file:', error);
                this.innerHTML = '<i class="fa-solid fa-trash"></i>';
                this.disabled = false;
                NProgress.done();
                showToast('Error deleting file', 'error');
            });
        }
    }
    
    // Handle file download
    function handleDownload(e) {
        const fileId = this.getAttribute('data-id');
        const originalHtml = this.innerHTML;
        
        this.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        
        // Create and click a temporary download link
        const downloadLink = document.createElement('a');
        downloadLink.href = `/download/${fileId}`;
        
        // After a short delay, reset the button
        setTimeout(() => {
            this.innerHTML = originalHtml;
        }, 1000);
        
        downloadLink.click();
    }
    
    // Load files on page load
    loadFiles();
});
