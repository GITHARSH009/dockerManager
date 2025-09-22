// Global state management
const AppState = {
    containers: [],
    images: [],
    activeTab: 'containers',
    isLoading: false
};

// API Base URL
const API_BASE = 'http://localhost:3000/api';

// DOM Elements
const elements = {
    containersGrid: document.getElementById('containersGrid'),
    imagesGrid: document.getElementById('imagesGrid'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    toastContainer: document.getElementById('toastContainer'),
    runningCount: document.getElementById('runningCount'),
    stoppedCount: document.getElementById('stoppedCount'),
    imagesCount: document.getElementById('imagesCount')
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    loadInitialData();
});

// Initialize application
function initializeApp() {
    console.log('🐳 Docker Manager initialized');
    showToast('Docker Manager loaded successfully!', 'success');
}

// Setup all event listeners
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = item.dataset.tab;
            switchTab(tab);
        });
    });

    // Quick action buttons
    document.getElementById('runContainerBtn').addEventListener('click', () => {
        openModal('runContainerModal');
    });

    document.getElementById('pullImageBtn').addEventListener('click', () => {
        openModal('pullImageModal');
    });

    document.getElementById('pullNewImageBtn').addEventListener('click', () => {
        openModal('pullImageModal');
    });

    document.getElementById('refreshBtn').addEventListener('click', () => {
        loadInitialData();
    });

    // Modal event listeners
    setupModalEventListeners();

    // Form submissions
    document.getElementById('runContainerForm').addEventListener('submit', handleCreateContainer);
    document.getElementById('pullImageForm').addEventListener('submit', handlePullImage);
}

// Setup modal event listeners
function setupModalEventListeners() {
    // Close modal buttons
    document.querySelectorAll('.close, [data-modal]').forEach(element => {
        element.addEventListener('click', (e) => {
            const modalId = element.dataset.modal;
            if (modalId) {
                closeModal(modalId);
            }
        });
    });

    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
}

// Tab switching functionality
function switchTab(tabName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    AppState.activeTab = tabName;

    // Load data for active tab
    if (tabName === 'containers') {
        loadContainers();
    } else if (tabName === 'images') {
        loadImages();
    }
}

// Load initial data
async function loadInitialData() {
    showLoading(true);
    try {
        await Promise.all([
            loadContainers(),
            loadImages()
        ]);
        updateStats();
    } catch (error) {
        showToast('Failed to load data', 'error');
        console.error('Error loading initial data:', error);
    } finally {
        showLoading(false);
    }
}

// Load containers from API
async function loadContainers() {
    try {
        const response = await fetch(`${API_BASE}/containers`);
        const containers = await response.json();
        AppState.containers = containers;
        renderContainers();
        updateStats();
    } catch (error) {
        showToast('Failed to load containers', 'error');
        console.error('Error loading containers:', error);
    }
}

// Load images from API
async function loadImages() {
    try {
        const response = await fetch(`${API_BASE}/images`);
        if (!response.ok) {
            throw new Error('Failed to fetch images');
        }
        const result = await response.json();
        AppState.images = result.data || [];
        renderImages();
        updateStats();
    } catch (error) {
        showToast('Failed to load images', 'error');
        console.error('Error loading images:', error);
        AppState.images = [];
        renderImages();
        updateStats();
    }
}

// Render containers in the grid
function renderContainers() {
    if (!elements.containersGrid) return;

    if (AppState.containers.length === 0) {
        elements.containersGrid.innerHTML = `
            <div class="empty-state">
                <h3>No containers found</h3>
                <p>Start by creating your first container!</p>
            </div>
        `;
        return;
    }

    elements.containersGrid.innerHTML = AppState.containers.map(container => {
        const isRunning = container.status === 'running';
        const statusClass = `status-${container.status}`;
        
        return `
            <div class="container-card">
                <div class="container-header">
                    <div>
                        <div class="container-name">${container.name}</div>
                        <div class="container-status ${statusClass}">${container.status}</div>
                    </div>
                </div>
                
                <div class="container-info">
                    <div class="info-row">
                        <span class="info-label">Image:</span>
                        <span class="info-value">${container.image}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">ID:</span>
                        <span class="info-value">${container.id.substring(0, 12)}</span>
                    </div>
                </div>

                ${isRunning && container.name!=='docker-manager-app' ? `
                <div class="proxy-info">
                    <div class="info-row">
                        <span class="info-label">Proxy URL:</span>
                        <span class="info-value">
                            <a href="http://${container.name}.localhost" target="_blank" class="proxy-link">
                                ${container.name}.localhost
                            </a>
                        </span>
                    </div>
                </div>
                ` : ''}

                <div class="container-actions">
                    ${isRunning ? 
                        `<button class="btn btn-danger btn-small" onclick="containerAction('${container.id}', 'stop')">
                            <span class="btn-icon">⏹️</span> Stop
                        </button>` :
                        `<button class="btn btn-success btn-small" onclick="containerAction('${container.id}', 'start')">
                            <span class="btn-icon">▶️</span> Start
                        </button>`
                    }
                    <button class="btn btn-secondary btn-small" onclick="containerAction('${container.id}', 'remove')">
                        <span class="btn-icon">🗑️</span> Remove
                    </button>
                    <button class="btn btn-secondary btn-small" onclick="containerAction('${container.id}', 'inspect')">
                        <span class="btn-icon">🔍</span> Inspect
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Render images in the grid
function renderImages() {
    if (!elements.imagesGrid) return;

    if (AppState.images.length === 0) {
        elements.imagesGrid.innerHTML = `
            <div class="empty-state">
                <h3>No images found</h3>
                <p>Pull your first image to get started!</p>
            </div>
        `;
        return;
    }

    elements.imagesGrid.innerHTML = AppState.images.map(image => {
        const tags = image.repoTags || ['<none>:<none>'];
        const mainTag = tags[0] || '<none>:<none>';
        
        return `
            <div class="image-card">
                <div class="container-header">
                    <div>
                        <div class="container-name">${mainTag}</div>
                    </div>
                </div>
                
                <div class="container-info">
                    <div class="info-row">
                        <span class="info-label">ID:</span>
                        <span class="info-value">${image.id.substring(0, 12)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Size:</span>
                        <span class="info-value">${image.size}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Created:</span>
                        <span class="info-value">${image.created}</span>
                    </div>
                </div>

                <div class="container-actions">
                    <button class="btn btn-primary btn-small" onclick="createContainerFromImage('${mainTag}')">
                        <span class="btn-icon">▶️</span> Create Container
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Container actions using the backend's container-Action endpoint
async function containerAction(containerId, actionType) {
    if (actionType === 'remove' && !confirm('Are you sure you want to remove this container?')) return;
    
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/container-Action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                containerId: containerId,
                type: actionType
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            if (actionType === 'inspect') {
                // Show inspect data in a modal
                showInspectModal(result.data);
            } else {
                showToast(`Container ${actionType}ed successfully`, 'success');
                loadContainers();
            }
        } else {
            throw new Error(`Failed to ${actionType} container`);
        }
    } catch (error) {
        showToast(`Failed to ${actionType} container`, 'error');
        console.error(`Error ${actionType}ing container:`, error);
    } finally {
        showLoading(false);
    }
}

// Show container inspect data
function showInspectModal(inspectData) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h3>Container Details</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div style="padding: 1.5rem;">
                <pre style="background: #f8f9fa; padding: 1rem; border-radius: 8px; max-height: 400px; overflow-y: auto; white-space: pre-wrap; font-family: 'Monaco', monospace; font-size: 0.85rem;">${JSON.stringify(inspectData, null, 2)}</pre>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Open proxy access modal
function openProxyModal(containerName) {
    const proxyUrl = `http://${containerName}.localhost`;
    const hostsEntry = `127.0.0.1 ${containerName}.localhost`;
    
    document.getElementById('proxyUrl').value = proxyUrl;
    document.getElementById('proxyDirectLink').href = proxyUrl;
    document.getElementById('hostsEntry').textContent = hostsEntry;
    
    openModal('proxyAccessModal');
}

// Copy proxy URL to clipboard
function copyProxyUrl() {
    const proxyUrlInput = document.getElementById('proxyUrl');
    proxyUrlInput.select();
    proxyUrlInput.setSelectionRange(0, 99999); // For mobile devices
    
    navigator.clipboard.writeText(proxyUrlInput.value).then(() => {
        showToast('Proxy URL copied to clipboard!', 'success');
    }).catch(() => {
        // Fallback for older browsers
        document.execCommand('copy');
        showToast('Proxy URL copied to clipboard!', 'success');
    });
}

// Copy hosts entry to clipboard
function copyHostsEntry() {
    const hostsEntry = document.getElementById('hostsEntry').textContent;
    
    navigator.clipboard.writeText(hostsEntry).then(() => {
        showToast('Hosts entry copied to clipboard!', 'success');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = hostsEntry;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Hosts entry copied to clipboard!', 'success');
    });
}

// Create container from image
function createContainerFromImage(imageName) {
    const [name, tag] = imageName.split(':');
    document.getElementById('imageName').value = name;
    document.getElementById('tagName').value = tag || 'latest';
    document.getElementById('containerName').value = `${name}-${Date.now()}`;
    openModal('runContainerModal');
}

// Form handlers
async function handleCreateContainer(e) {
    e.preventDefault();
    
    const imageName = document.getElementById('imageName').value;
    const tagName = document.getElementById('tagName').value || 'latest';
    const containerName = document.getElementById('containerName').value;
    
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/create-container`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imageName: imageName,
                tagName: tagName,
                containerName: containerName
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast(`Container "${containerName}" created successfully!`, 'success');
            closeModal('runContainerModal');
            document.getElementById('runContainerForm').reset();
            loadContainers();
        } else {
            throw new Error(result.message || 'Failed to create container');
        }
    } catch (error) {
        showToast(`Failed to create container: ${error.message}`, 'error');
        console.error('Error creating container:', error);
    } finally {
        showLoading(false);
    }
}

async function handlePullImage(e) {
    e.preventDefault();
    
    const imageName = document.getElementById('pullImageName').value;
    const tagName = document.getElementById('pullTagName').value || 'latest';
    
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/pull-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imageName: imageName,
                tagName: tagName
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast(`Image "${imageName}:${tagName}" pulled successfully!`, 'success');
            closeModal('pullImageModal');
            document.getElementById('pullImageForm').reset();
            loadImages();
        } else {
            throw new Error(result.message || 'Failed to pull image');
        }
    } catch (error) {
        showToast(`Failed to pull image: ${error.message}`, 'error');
        console.error('Error pulling image:', error);
    } finally {
        showLoading(false);
    }
}

// Modal management
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

// Utility functions
function showLoading(show) {
    elements.loadingSpinner.style.display = show ? 'flex' : 'none';
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div style="font-weight: 500;">${message}</div>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function updateStats() {
    const running = AppState.containers.filter(c => c.status === 'running').length;
    const stopped = AppState.containers.filter(c => c.status !== 'running').length;
    
    if (elements.runningCount) elements.runningCount.textContent = running;
    if (elements.stoppedCount) elements.stoppedCount.textContent = stopped;
    if (elements.imagesCount) elements.imagesCount.textContent = AppState.images.length;
}