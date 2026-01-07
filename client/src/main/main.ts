/**
 * CreaBomber Electron Main Process
 * Manages the notification overlay window and application lifecycle
 */

import { app, BrowserWindow, screen, ipcMain } from 'electron';
import * as path from 'path';
import { connect, getDeviceInfo, getConnectionStatus, getServerUrl } from './socket';

// Notification window configuration
const NOTIFICATION_WIDTH = 400;
const NOTIFICATION_HEIGHT = 200;
const NOTIFICATION_MARGIN = 20;

// Auto-dismiss timeouts (in milliseconds)
const TIMEOUT_TEXT = 8000;
const TIMEOUT_IMAGE = 12000;
const TIMEOUT_VIDEO = 15000;
const TIMEOUT_AUDIO = 10000;

// Message payload interface (mirrors server types)
interface MessagePayload {
  id: string;
  type: 'TEXT' | 'TEXT_IMAGE' | 'VIDEO' | 'AUDIO';
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  audioAutoplay?: boolean;
  targetDevices: string[];
  timestamp: number;
}

// Notification queue for handling multiple notifications
interface QueuedNotification {
  payload: MessagePayload;
  timeout: number;
}

// Global references
let notificationWindow: BrowserWindow | null = null;
let notificationQueue: QueuedNotification[] = [];
let currentNotificationTimeout: NodeJS.Timeout | null = null;
let isNotificationVisible = false;

/**
 * Create the notification overlay window
 * - Frameless and transparent for custom styling
 * - Always on top for visibility
 * - Positioned in top-right corner
 */
function createNotificationWindow(): BrowserWindow {
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;

  const window = new BrowserWindow({
    width: NOTIFICATION_WIDTH,
    height: NOTIFICATION_HEIGHT,
    x: screenWidth - NOTIFICATION_WIDTH - NOTIFICATION_MARGIN,
    y: NOTIFICATION_MARGIN,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    focusable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Make visible on all workspaces (macOS spaces)
  window.setVisibleOnAllWorkspaces(true);

  // Load the notification renderer
  const rendererPath = app.isPackaged
    ? path.join(process.resourcesPath, 'renderer', 'notification.html')
    : path.join(__dirname, '../../src/renderer/notification.html');

  window.loadFile(rendererPath);

  // Prevent window from grabbing focus when shown
  window.setAlwaysOnTop(true, 'floating');

  // Handle window ready
  window.once('ready-to-show', () => {
    console.log('[Main] Notification window ready');
  });

  return window;
}

/**
 * Get the appropriate timeout based on message type
 */
function getTimeoutForType(type: MessagePayload['type']): number {
  switch (type) {
    case 'TEXT':
      return TIMEOUT_TEXT;
    case 'TEXT_IMAGE':
      return TIMEOUT_IMAGE;
    case 'VIDEO':
      return TIMEOUT_VIDEO;
    case 'AUDIO':
      return TIMEOUT_AUDIO;
    default:
      return TIMEOUT_TEXT;
  }
}

/**
 * Show a notification with the given payload
 * If a notification is already visible, queue the new one
 */
export function showNotification(payload: MessagePayload): void {
  const timeout = getTimeoutForType(payload.type);

  if (isNotificationVisible) {
    // Queue the notification if one is already showing
    notificationQueue.push({ payload, timeout });
    console.log(`[Main] Notification queued: ${payload.id} (${notificationQueue.length} in queue)`);
    return;
  }

  displayNotification(payload, timeout);
}

/**
 * Display a notification immediately
 */
function displayNotification(payload: MessagePayload, timeout: number): void {
  if (!notificationWindow) {
    console.error('[Main] Notification window not initialized');
    return;
  }

  console.log(`[Main] Displaying notification: ${payload.id} (type: ${payload.type})`);

  // Reposition window to top-right (screen might have changed)
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;
  notificationWindow.setPosition(
    screenWidth - NOTIFICATION_WIDTH - NOTIFICATION_MARGIN,
    NOTIFICATION_MARGIN
  );

  // Send payload to renderer
  notificationWindow.webContents.send('notification:show', payload);

  // Show the window
  notificationWindow.show();
  isNotificationVisible = true;

  // Set auto-dismiss timeout
  if (currentNotificationTimeout) {
    clearTimeout(currentNotificationTimeout);
  }

  currentNotificationTimeout = setTimeout(() => {
    hideNotification();
  }, timeout);
}

/**
 * Hide the current notification and show the next queued one if any
 */
export function hideNotification(): void {
  if (!notificationWindow) return;

  // Clear the timeout
  if (currentNotificationTimeout) {
    clearTimeout(currentNotificationTimeout);
    currentNotificationTimeout = null;
  }

  // Hide the window
  notificationWindow.hide();
  isNotificationVisible = false;

  // Tell renderer to clear content
  notificationWindow.webContents.send('notification:hide');

  console.log('[Main] Notification hidden');

  // Process next notification in queue
  if (notificationQueue.length > 0) {
    const next = notificationQueue.shift()!;
    console.log(`[Main] Processing next queued notification: ${next.payload.id}`);

    // Small delay before showing next notification
    setTimeout(() => {
      displayNotification(next.payload, next.timeout);
    }, 300);
  }
}

/**
 * Clear all queued notifications
 */
export function clearNotificationQueue(): void {
  notificationQueue = [];
  console.log('[Main] Notification queue cleared');
}

/**
 * Update notification window size (for media content)
 */
function updateWindowSize(width: number, height: number): void {
  if (!notificationWindow) return;

  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;
  const newWidth = Math.min(width, 600);
  const newHeight = Math.min(height, 400);

  notificationWindow.setSize(newWidth, newHeight);
  notificationWindow.setPosition(
    screenWidth - newWidth - NOTIFICATION_MARGIN,
    NOTIFICATION_MARGIN
  );
}

/**
 * Setup IPC handlers for renderer communication
 */
function setupIPCHandlers(): void {
  // Handle close button click from renderer
  ipcMain.on('notification:close', () => {
    hideNotification();
  });

  // Handle window resize request from renderer
  ipcMain.on('notification:resize', (_event, { width, height }) => {
    updateWindowSize(width, height);
  });

  // Get device info for renderer
  ipcMain.handle('device:getInfo', () => {
    const deviceInfo = getDeviceInfo();
    return {
      id: deviceInfo.id,
      name: deviceInfo.name,
      hostname: deviceInfo.hostname,
      platform: deviceInfo.platform,
      connected: deviceInfo.connected,
    };
  });

  // Get connection status for renderer
  ipcMain.handle('connection:getStatus', () => {
    return getConnectionStatus();
  });

  // Get server URL for renderer
  ipcMain.handle('connection:getServerUrl', () => {
    return getServerUrl();
  });
}

/**
 * Initialize the application
 */
async function initialize(): Promise<void> {
  console.log('[Main] Initializing CreaBomber client...');

  // Setup IPC handlers
  setupIPCHandlers();

  // Create notification window
  notificationWindow = createNotificationWindow();

  // Connect to dashboard WebSocket server
  connect();

  console.log('[Main] CreaBomber client initialized');
}

/**
 * App lifecycle events
 */
app.whenReady().then(() => {
  initialize();

  // macOS: Re-create window if dock icon clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      notificationWindow = createNotificationWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup on quit
app.on('will-quit', () => {
  if (currentNotificationTimeout) {
    clearTimeout(currentNotificationTimeout);
  }
});

// Export for use by socket.ts
export { notificationWindow };
