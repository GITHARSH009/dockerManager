// Global state management
const AppState = {
    containers: [],
    images: [],
    networks :[],
    volumes : [],
    systemInfo : null,
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
    imagesCount: document.getElementById('imagesCount'),
    networksGrid: document.getElementById('networksGrid'),
    volumesGrid: document.getElementById('volumesGrid'),
    systemStats: document.getElementById('systemStats'),
    systemInfo: document.getElementById('systemInfo')
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

    document.getElementById('createNetworkBtn').addEventListener('click', () => {
    openModal('createNetworkModal');
});

document.getElementById('createVolumeBtn').addEventListener('click', () => {
    openModal('createVolumeModal');
});

document.getElementById('loadSystemInfoBtn').addEventListener('click', () => {
    loadSystemInfo();
});

document.getElementById('pruneNetworksBtn').addEventListener('click', () => {
    pruneNetworks();
});

document.getElementById('pruneVolumesBtn').addEventListener('click', () => {
    pruneVolumes();
});

document.getElementById('pruneContainersBtn').addEventListener('click', () => {
    pruneContainers();
});

document.getElementById('pruneImagesBtn').addEventListener('click', () => {
    pruneImages();
});

    // Modal event listeners
    setupModalEventListeners();

    // Form submissions
    document.getElementById('runContainerForm').addEventListener('submit', handleCreateContainer);
    document.getElementById('pullImageForm').addEventListener('submit', handlePullImage);
    document.getElementById('createNetworkForm').addEventListener('submit', handleCreateNetwork);
    document.getElementById('createVolumeForm').addEventListener('submit', handleCreateVolume);
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
    } else if (tabName === 'networks') {
        loadNetworks();
    } else if (tabName === 'volumes') {
        loadVolumes();
    }
}

// Load initial data
async function loadInitialData() {
    showLoading(true);
    try {
        await Promise.all([
            loadContainers(),
            loadImages(),
            loadNetworks(),
            loadVolumes()
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
// Load networks from API
async function loadNetworks() {
    try {
        const response = await fetch(`${API_BASE}/networks`);
        if (!response.ok) {
            throw new Error('Failed to fetch networks');
        }
        const result = await response.json();
        AppState.networks = Array.isArray(result.data) ? result.data : [];
        renderNetworks();
        updateStats();
    } catch (error) {
        console.error('Error loading networks:', error);
        AppState.networks = [];
        renderNetworks();
        updateStats();
        // Don't show toast for empty networks - it's normal
    }
}

// Load volumes from API
async function loadVolumes() {
    try {
        const response = await fetch(`${API_BASE}/volumes`);
        if (!response.ok) {
            throw new Error('Failed to fetch volumes');
        }
        const result = await response.json();
        AppState.volumes = Array.isArray(result.data) ? result.data : [];
        renderVolumes();
        updateStats();
    } catch (error) {
        console.error('Error loading volumes:', error);
        AppState.volumes = [];
        renderVolumes();
        updateStats();
        // Don't show toast for empty volumes - it's normal
    }
}

// Load system info
async function loadSystemInfo() {
    try {
        const response = await fetch(`${API_BASE}/system-info`);
        if (!response.ok) {
            throw new Error('Failed to fetch system info');
        }
        const result = await response.json();
        AppState.systemInfo = result.data;
        renderSystemInfo();
        document.getElementById('systemInfo').style.display = 'block';
    } catch (error) {
        showToast('Failed to load system info', 'error');
        console.error('Error loading system info:', error);
    }
}

// Render networks in the grid
function renderNetworks() {
    if (!elements.networksGrid) return;

    // Ensure we have a valid array
    const networks = Array.isArray(AppState.networks) ? AppState.networks : [];

    if (networks.length === 0) {
        elements.networksGrid.innerHTML = `
            <div class="empty-state">
                <h3>No networks found</h3>
                <p>Create your first network to get started!</p>
            </div>
        `;
        return;
    }

    elements.networksGrid.innerHTML = networks.map(network => {
        // Safely access properties with fallbacks
        const name = network?.Name || 'Unknown';
        const id = network?.Id || '';
        const driver = network?.Driver || 'Unknown';
        const scope = network?.Scope || 'Unknown';
        const created = network?.Created ? new Date(network.Created).toLocaleDateString() : 'N/A';
        
        return `
            <div class="network-card">
                <div class="container-header">
                    <div>
                        <div class="network-name">${name}</div>
                        <div class="network-driver">${driver}</div>
                    </div>
                </div>
                
                <div class="network-info">
                    <div class="info-row">
                        <span class="info-label">ID:</span>
                        <span class="info-value">${id.substring(0, 12)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Scope:</span>
                        <span class="network-scope">${scope}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Created:</span>
                        <span class="info-value">${created}</span>
                    </div>
                </div>

                <div class="container-actions">
                    <button class="btn btn-secondary btn-small" onclick="inspectNetwork('${id}')">
                        <span class="btn-icon">🔍</span> Inspect
                    </button>
                    ${!['bridge', 'host', 'none'].includes(name) ? `
                    <button class="btn btn-danger btn-small" onclick="deleteNetwork('${id}')">
                        <span class="btn-icon">🗑️</span> Delete
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Render volumes in the grid
function renderVolumes() {
    if (!elements.volumesGrid) return;

    // Ensure we have a valid array
    const volumes = Array.isArray(AppState.volumes) ? AppState.volumes : [];

    if (volumes.length === 0) {
        elements.volumesGrid.innerHTML = `
            <div class="empty-state">
                <h3>No volumes found</h3>
                <p>Create your first volume to get started!</p>
            </div>
        `;
        return;
    }

    elements.volumesGrid.innerHTML = volumes.map(volume => {
        // Safely access properties with fallbacks
        const name = volume?.Name || 'Unknown';
        const driver = volume?.Driver || 'Unknown';
        const mountpoint = volume?.Mountpoint || 'N/A';
        const createdAt = volume?.CreatedAt ? new Date(volume.CreatedAt).toLocaleDateString() : 'N/A';
        
        return `
            <div class="volume-card">
                <div class="container-header">
                    <div>
                        <div class="volume-name">${name}</div>
                        <div class="volume-driver">${driver}</div>
                    </div>
                </div>
                
                <div class="volume-info">
                    <div class="info-row">
                        <span class="info-label">Mountpoint:</span>
                        <span class="info-value">${mountpoint}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Created:</span>
                        <span class="info-value">${createdAt}</span>
                    </div>
                </div>

                <div class="container-actions">
                    <button class="btn btn-secondary btn-small" onclick="inspectVolume('${name}')">
                        <span class="btn-icon">🔍</span> Inspect
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteVolume('${name}')">
                        <span class="btn-icon">🗑️</span> Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Render system info
function renderSystemInfo() {
    if (!AppState.systemInfo || !elements.systemStats) return;
    
    const info = AppState.systemInfo;
    elements.systemStats.innerHTML = `
        <div class="system-stat">
            <span class="system-stat-value">${info.Containers || 0}</span>
            <span class="system-stat-label">Total Containers</span>
        </div>
        <div class="system-stat">
            <span class="system-stat-value">${info.ContainersRunning || 0}</span>
            <span class="system-stat-label">Running</span>
        </div>
        <div class="system-stat">
            <span class="system-stat-value">${info.Images || 0}</span>
            <span class="system-stat-label">Images</span>
        </div>
        <div class="system-stat">
            <span class="system-stat-value">${Math.round((info.MemTotal || 0) / 1024 / 1024 / 1024)} GB</span>
            <span class="system-stat-label">Total Memory</span>
        </div>
    `;
}

// Network actions
async function inspectNetwork(networkId) {
    try {
        const response = await fetch(`${API_BASE}/network-inspect/${networkId}`);
        const result = await response.json();
        
        if (response.ok) {
            showInspectModal(result.data, 'Network Details');
        } else {
            throw new Error('Failed to inspect network');
        }
    } catch (error) {
        showToast('Failed to inspect network', 'error');
        console.error('Error inspecting network:', error);
    }
}

async function deleteNetwork(networkId) {
    if (!confirm('Are you sure you want to delete this network?')) return;
    
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/delete-network`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ networkId })
        });
        
        if (response.ok) {
            showToast('Network deleted successfully', 'success');
            await loadNetworks();
        } else {
            throw new Error('Failed to delete network');
        }
    } catch (error) {
        showToast('Failed to delete network', 'error');
        console.error('Error deleting network:', error);
    } finally {
        showLoading(false);
    }
}

// Volume actions
async function inspectVolume(volumeName) {
    try {
        const response = await fetch(`${API_BASE}/volume-inspect/${volumeName}`);
        const result = await response.json();
        
        if (response.ok) {
            showInspectModal(result.data, 'Volume Details');
        } else {
            throw new Error('Failed to inspect volume');
        }
    } catch (error) {
        showToast('Failed to inspect volume', 'error');
        console.error('Error inspecting volume:', error);
    }
}

async function deleteVolume(volumeName) {
    if (!confirm('Are you sure you want to delete this volume?')) return;
    
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/delete-volume`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ volumeName })
        });
        
        if (response.ok) {
            showToast('Volume deleted successfully', 'success');
            await loadVolumes();
        } else {
            throw new Error('Failed to delete volume');
        }
    } catch (error) {
        showToast('Failed to delete volume', 'error');
        console.error('Error deleting volume:', error);
    } finally {
        showLoading(false);
    }
}

// Prune functions
async function pruneNetworks() {
    if (!confirm('Are you sure you want to prune unused networks? This cannot be undone.')) return;
    
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/prune-networks`, { method: 'DELETE' });
        if (response.ok) {
            showToast('Unused networks pruned successfully', 'success');
            await loadNetworks();
        } else {
            throw new Error('Failed to prune networks');
        }
    } catch (error) {
        showToast('Failed to prune networks', 'error');
        console.error('Error pruning networks:', error);
    } finally {
        showLoading(false);
    }
}

async function pruneVolumes() {
    if (!confirm('Are you sure you want to prune unused volumes? This cannot be undone.')) return;
    
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/prune-volumes`, { method: 'DELETE' });
        if (response.ok) {
            showToast('Unused volumes pruned successfully', 'success');
            await loadVolumes();
        } else {
            throw new Error('Failed to prune volumes');
        }
    } catch (error) {
        showToast('Failed to prune volumes', 'error');
        console.error('Error pruning volumes:', error);
    } finally {
        showLoading(false);
    }
}

async function pruneContainers() {
    if (!confirm('Are you sure you want to prune unused containers? This cannot be undone.')) return;
    
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/prune-containers`, { method: 'DELETE' });
        if (response.ok) {
            showToast('Unused containers pruned successfully', 'success');
            await loadContainers();
        } else {
            throw new Error('Failed to prune containers');
        }
    } catch (error) {
        showToast('Failed to prune containers', 'error');
        console.error('Error pruning containers:', error);
    } finally {
        showLoading(false);
    }
}

async function pruneImages() {
    if (!confirm('Are you sure you want to prune unused images? This cannot be undone.')) return;
    
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/prune-images`, { method: 'DELETE' });
        if (response.ok) {
            showToast('Unused images pruned successfully', 'success');
            await loadImages();
        } else {
            throw new Error('Failed to prune images');
        }
    } catch (error) {
        showToast('Failed to prune images', 'error');
        console.error('Error pruning images:', error);
    } finally {
        showLoading(false);
    }
}

// Form handlers for new modals
async function handleCreateNetwork(e) {
    e.preventDefault();
    
    const networkName = document.getElementById('networkName').value;
    
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/create-network`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ networkName })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast(`Network "${networkName}" created successfully!`, 'success');
            closeModal('createNetworkModal');
            document.getElementById('createNetworkForm').reset();
            await loadNetworks();
        } else {
            throw new Error(result.message || 'Failed to create network');
        }
    } catch (error) {
        showToast(`Failed to create network: ${error.message}`, 'error');
        console.error('Error creating network:', error);
    } finally {
        showLoading(false);
    }
}

async function handleCreateVolume(e) {
    e.preventDefault();
    
    const volumeName = document.getElementById('volumeName').value;
    
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/create-volume`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ volumeName })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast(`Volume "${volumeName}" created successfully!`, 'success');
            closeModal('createVolumeModal');
            document.getElementById('createVolumeForm').reset();
            await loadVolumes();
        } else {
            throw new Error(result.message || 'Failed to create volume');
        }
    } catch (error) {
        showToast(`Failed to create volume: ${error.message}`, 'error');
        console.error('Error creating volume:', error);
    } finally {
        showLoading(false);
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
                // Auto-refresh containers after any action
                await loadContainers();
            }
        } else {
            throw new Error(`Failed to ${actionType} container`);
        }
    } catch (error) {
        showToast(`Failed to ${actionType} container`, 'error');
        console.error(`Error ${actionType}ing container:`, error);
        // Refresh even on error to sync UI state
        await loadContainers();
    } finally {
        showLoading(false);
    }
}

// Show container inspect data
function showInspectModal(inspectData, title = 'Container Details') {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h3>${title}</h3>
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
            // Auto-refresh containers after creation
            await loadContainers();
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
            // Auto-refresh images after pulling
            await loadImages();
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
    const containers = Array.isArray(AppState.containers) ? AppState.containers : [];
    const images = Array.isArray(AppState.images) ? AppState.images : [];
    
    const running = containers.filter(c => c?.status === 'running').length;
    const stopped = containers.filter(c => c?.status && c.status !== 'running').length;
    
    if (elements.runningCount) elements.runningCount.textContent = running;
    if (elements.stoppedCount) elements.stoppedCount.textContent = stopped;
    if (elements.imagesCount) elements.imagesCount.textContent = images.length;
}