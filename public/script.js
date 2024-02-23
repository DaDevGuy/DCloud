const uploadForm = document.getElementById('uploadForm');
const fileList = document.getElementById('fileList');
const progressBarContainer = document.getElementById('progressBarContainer');
const progressBar = document.getElementById('progressBar');
const totalSizeContainer = document.getElementById('totalSize');

// Function to handle file upload
uploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const formData = new FormData(uploadForm);
    const response = await fetch('/upload', {
        method: 'POST',
        body: formData,
        // Add option to track upload progress
        onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            progressBar.style.width = `${progress}%`;
            progressBar.textContent = `${progress}%`; // Display progress text
        }
    });

    if (response.ok) {
        alert('File uploaded successfully');
        progressBar.style.width = '0%'; // Reset progress bar after upload
        progressBar.textContent = ''; // Clear progress text
        refreshFileList();
    } else {
        alert('Error uploading file');
    }
});


// Function to fetch and display uploaded files
// (Remaining code remains the same)


// Function to fetch and display uploaded files
async function refreshFileList() {
    const response = await fetch('/files');
    const files = await response.json();

    fileList.innerHTML = '';

    files.forEach(file => {
        const tr = document.createElement('tr');
        
        const nameTd = document.createElement('td');
        nameTd.textContent = file.filename;
        tr.appendChild(nameTd);
        
        const sizeTd = document.createElement('td');
        sizeTd.textContent = `${file.size} bytes`;
        tr.appendChild(sizeTd);
        
        const deleteTd = document.createElement('td');
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', async () => {
            const confirmDelete = confirm('Are you sure you want to delete this file?');
            if (confirmDelete) {
                await deleteFile(file.id);
                refreshFileList();
            }
        });
        deleteTd.appendChild(deleteButton);
        tr.appendChild(deleteTd);
        
        const downloadTd = document.createElement('td');
        const downloadButton = document.createElement('button');
        downloadButton.textContent = 'Download';
        downloadButton.addEventListener('click', async () => {
            window.location.href = `/download/${file.id}`;
        });
        downloadTd.appendChild(downloadButton);
        tr.appendChild(downloadTd);
        
        fileList.appendChild(tr);
    });
}

// Function to delete file
async function deleteFile(fileId) {
    const response = await fetch(`/delete/${fileId}`, {
        method: 'DELETE'
    });

    if (!response.ok) {
        console.error('Error deleting file');
    }
}



// Function to fetch and display the total file size
async function refreshTotalSize() {
    const response = await fetch('/totalSize');
    const data = await response.json();

    totalSizeContainer.textContent = `Total File Size: ${data.totalSize} bytes`;
}

// Call the function to refresh the total file size initially
refreshTotalSize();
// Initial file list refresh
refreshFileList();
