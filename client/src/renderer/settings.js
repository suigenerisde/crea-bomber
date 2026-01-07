/**
 * CreaBomber Settings Window Renderer
 * Handles settings form interactions
 */

// DOM elements
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const serverUrlInput = document.getElementById('serverUrl');
const settingsForm = document.getElementById('settingsForm');
const cancelBtn = document.getElementById('cancelBtn');
const saveBtn = document.getElementById('saveBtn');

// Status text mapping
const statusMessages = {
  connected: 'Connected',
  connecting: 'Connecting...',
  disconnected: 'Disconnected',
  error: 'Connection Error',
};

/**
 * Update the status indicator UI
 * @param {string} status - Connection status
 */
function updateStatusUI(status) {
  // Update dot class
  statusDot.className = 'status-dot ' + status;

  // Update text
  statusText.textContent = statusMessages[status] || 'Unknown';
}

/**
 * Load current settings from main process
 */
async function loadSettings() {
  try {
    // Use the preload API to get settings
    const settings = await window.creaBomber.getSettings();

    if (settings) {
      serverUrlInput.value = settings.serverUrl || '';
      updateStatusUI(settings.connectionStatus);
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
    // Fallback: try individual getters
    try {
      const serverUrl = await window.creaBomber.getServerUrl();
      const status = await window.creaBomber.getConnectionStatus();
      serverUrlInput.value = serverUrl || '';
      updateStatusUI(status);
    } catch (e) {
      console.error('Fallback also failed:', e);
    }
  }
}

/**
 * Save settings to main process
 * @param {Event} event - Form submit event
 */
async function saveSettings(event) {
  event.preventDefault();

  const serverUrl = serverUrlInput.value.trim();

  if (!serverUrl) {
    serverUrlInput.focus();
    return;
  }

  // Validate URL format
  try {
    new URL(serverUrl);
  } catch {
    alert('Please enter a valid URL');
    serverUrlInput.focus();
    return;
  }

  // Disable save button during save
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const result = await window.creaBomber.saveSettings({ serverUrl });

    if (result && result.success) {
      // Settings saved successfully, close window
      window.creaBomber.closeSettings();
    } else {
      alert('Failed to save settings');
    }
  } catch (error) {
    console.error('Failed to save settings:', error);
    alert('Failed to save settings: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save & Reconnect';
  }
}

/**
 * Close the settings window without saving
 */
function cancelSettings() {
  window.creaBomber.closeSettings();
}

// Event listeners
settingsForm.addEventListener('submit', saveSettings);
cancelBtn.addEventListener('click', cancelSettings);

// Load settings on page load
loadSettings();
