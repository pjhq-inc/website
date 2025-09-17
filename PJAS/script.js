const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileDetails = document.getElementById('fileDetails');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const statusMessage = document.getElementById('statusMessage');

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

dropZone.addEventListener('click', () => {
    fileInput.click();
});

function handleFile(file) {
    const allowedTypes = ['.zip', '.rar', '.7z', '.tar', '.gz'];
    const fileName = file.name.toLowerCase();
    const isValidType = allowedTypes.some(type => fileName.endsWith(type));

    if (!isValidType) {
        showStatus('Please select a valid archive file (.zip, .rar, .7z, .tar, .gz)', 'error');
        return;
    }

    fileDetails.innerHTML = `
        <strong>Name:</strong> ${file.name}<br>
        <strong>Size:</strong> ${formatFileSize(file.size)}<br>
        <strong>Type:</strong> ${file.type || 'Archive'}
    `;
    fileInfo.style.display = 'block';

    uploadFile(file);
}

function uploadFile(file) {
    dropZone.classList.add('uploading');
    progressContainer.style.display = 'block';
    statusMessage.style.display = 'none';

    const formData = new FormData();
    formData.append('file', file);
    
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            progressFill.style.width = progress + '%';
            progressText.textContent = `Uploading to PJAS network... ${Math.floor(progress)}%`;
        }
    });
    
    xhr.addEventListener('load', () => {
        try {
            const response = JSON.parse(xhr.responseText);
            dropZone.classList.remove('uploading');
            progressContainer.style.display = 'none';
            
            if (response.success) {
                showStatus(`File uploaded successfully! Distributed across ${response.chunks} chunks.`, 'success');
                setTimeout(() => {
                    loadStoredFiles();
                }, 1000);
            } else {
                showStatus('Upload failed: ' + response.error, 'error');
            }
            
            setTimeout(() => {
                resetForm();
            }, 3000);
            
        } catch (error) {
            dropZone.classList.remove('uploading');
            progressContainer.style.display = 'none';
            showStatus('Upload failed: Invalid response from server', 'error');
        }
    });
    
    xhr.addEventListener('error', () => {
        dropZone.classList.remove('uploading');
        progressContainer.style.display = 'none';
        showStatus('Upload failed: Network error', 'error');
    });
    
    xhr.open('POST', '/api/files/upload');
    xhr.send(formData);
}

function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message status-${type}`;
    statusMessage.style.display = 'block';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function resetForm() {
    fileInput.value = '';
    fileInfo.style.display = 'none';
    statusMessage.style.display = 'none';
    progressContainer.style.display = 'none';
    progressFill.style.width = '0%';
}

document.addEventListener('DOMContentLoaded', () => {
    loadStoredFiles();
});

async function loadStoredFiles() {
    try {
        const response = await fetch('/api/files');
        const data = await response.json();
        
        if (data.success) {
            displayFiles(data.files);
        } else {
            console.error('Failed to load files:', data.error);
        }
    } catch (error) {
        console.error('Error loading files:', error);
    }
}

function displayFiles(files) {
    const filesGrid = document.getElementById('filesGrid');
    
    if (!files || files.length === 0) {
        filesGrid.innerHTML = `
            <div class="no-files">
                <h3>No files stored yet</h3>
            </div>
        `;
        return;
    }

    filesGrid.innerHTML = files.map(file => {
        const uploadDate = new Date(file.uploaded_at).toLocaleDateString();
        const uploadTime = new Date(file.uploaded_at).toLocaleTimeString();
        
        return `
            <div class="file-card">
                <div class="file-header">
                    <div>
                        <div class="file-name">${file.filename}</div>
                        <div class="file-size">${formatFileSize(file.size)}</div>
                    </div>
                </div>
                <div class="file-details">
                    <div class="file-detail">
                        <strong>Uploaded</strong>
                        ${uploadDate}
                    </div>
                    <div class="file-detail">
                        <strong>Time</strong>
                        ${uploadTime}
                    </div>
                    <div class="file-detail">
                        <strong>Chunks</strong>
                        ${file.chunks_count}
                    </div>
                    <div class="file-detail">
                        <strong>Status</strong>
                        ${file.status}
                    </div>
                </div>
                <button class="download-btn" 
                        onclick="downloadFile('${file.file_id}', '${file.filename}')"
                        ${file.status !== 'completed' ? 'disabled' : ''}>
                    <span>📥</span>
                    ${file.status === 'completed' ? 'Download' : 'Processing...'}
                </button>
            </div>
        `;
    }).join('');
}

async function downloadFile(fileId, filename) {
    const downloadBtn = event.target;
    const originalContent = downloadBtn.innerHTML;
    
    try {
        downloadBtn.disabled = true;
        downloadBtn.classList.add('downloading');
        downloadBtn.innerHTML = '<span>⬇️</span> Downloading...';
        
        const response = await fetch(`/api/files/download/${fileId}`);
        
        if (!response.ok) {
            throw new Error('Download failed');
        }
        
        const blob = await response.blob();
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showStatus(`Downloaded ${filename} successfully!`, 'success');
        
    } catch (error) {
        console.error('Download error:', error);
        showStatus(`Download failed: ${error.message}`, 'error');
    } finally {
        downloadBtn.disabled = false;
        downloadBtn.classList.remove('downloading');
        downloadBtn.innerHTML = originalContent;
    }
}

fileInput.addEventListener('change', (e) => {
    if (e.target.files[0] && e.target.files[0].name.toLowerCase().includes('world')) {
        setTimeout(() => {
            dropZone.querySelector('.drop-icon').textContent = '🌍';
        }, 100);
    }
});