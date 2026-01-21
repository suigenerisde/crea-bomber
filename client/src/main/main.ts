/**
 * CreaBomber Electron Main Process
 * Manages the notification overlay window and application lifecycle
 */

import { app, BrowserWindow, screen, ipcMain, Menu } from 'electron';
import * as path from 'path';
import {
  connect,
  getDeviceInfo,
  getConnectionStatus,
  getServerUrl,
  setServerUrl,
  getDeviceName,
  setDeviceName,
  getOpenAtLogin,
  setOpenAtLogin,
  reconnect,
  isFirstRun,
  isPreconfigured,
  prepareForShutdown,
} from './socket';
import { initializeTray, destroyTray } from './tray';
import { initSupabase, processScheduledMessages } from './scheduled';

// Supabase configuration (set via environment variables or config)
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// Notification window configuration (larger for better media visibility)
const NOTIFICATION_WIDTH_TEXT = 450;
const NOTIFICATION_HEIGHT_TEXT = 200;
const NOTIFICATION_WIDTH_MEDIA = 600;
const NOTIFICATION_HEIGHT_IMAGE = 550;
const NOTIFICATION_HEIGHT_VIDEO = 500;
const NOTIFICATION_HEIGHT_AUDIO = 250;
const NOTIFICATION_MARGIN = 20;

// Note: No auto-dismiss - notifications stay until user closes them

// Message payload interface (mirrors server types)
interface MessagePayload {
  id: string;
  type: 'TEXT' | 'TEXT_IMAGE' | 'VIDEO' | 'AUDIO';
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  videoAutoplay?: boolean;
  audioAutoplay?: boolean;
  targetDevices: string[];
  timestamp: number;
}

// Notification queue for handling multiple notifications
interface QueuedNotification {
  payload: MessagePayload;
}

// Global references
let notificationWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
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
    width: NOTIFICATION_WIDTH_MEDIA,
    height: NOTIFICATION_HEIGHT_IMAGE,
    x: screenWidth - NOTIFICATION_WIDTH_MEDIA - NOTIFICATION_MARGIN,
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
 * Get window dimensions based on message type
 */
function getWindowDimensionsForType(type: MessagePayload['type']): { width: number; height: number } {
  switch (type) {
    case 'TEXT':
      return { width: NOTIFICATION_WIDTH_TEXT, height: NOTIFICATION_HEIGHT_TEXT };
    case 'TEXT_IMAGE':
      return { width: NOTIFICATION_WIDTH_MEDIA, height: NOTIFICATION_HEIGHT_IMAGE };
    case 'VIDEO':
      return { width: NOTIFICATION_WIDTH_MEDIA, height: NOTIFICATION_HEIGHT_VIDEO };
    case 'AUDIO':
      return { width: NOTIFICATION_WIDTH_TEXT, height: NOTIFICATION_HEIGHT_AUDIO };
    default:
      return { width: NOTIFICATION_WIDTH_TEXT, height: NOTIFICATION_HEIGHT_TEXT };
  }
}

/**
 * Show a notification with the given payload
 * If a notification is already visible, queue the new one
 */
export function showNotification(payload: MessagePayload): void {
  if (isNotificationVisible) {
    // Queue the notification if one is already showing
    notificationQueue.push({ payload });
    console.log(`[Main] Notification queued: ${payload.id} (${notificationQueue.length} in queue)`);
    return;
  }

  displayNotification(payload);
}

/**
 * Display a notification immediately
 */
function displayNotification(payload: MessagePayload): void {
  if (!notificationWindow) {
    console.error('[Main] Notification window not initialized');
    return;
  }

  console.log(`[Main] Displaying notification: ${payload.id} (type: ${payload.type})`);

  // Get window dimensions based on content type
  const { width, height } = getWindowDimensionsForType(payload.type);

  // Set window size
  notificationWindow.setSize(width, height);

  // Reposition window to top-right (screen might have changed)
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;
  notificationWindow.setPosition(
    screenWidth - width - NOTIFICATION_MARGIN,
    NOTIFICATION_MARGIN
  );

  // Send payload to renderer - window will be shown after preload completes
  notificationWindow.webContents.send('notification:show', payload);
  isNotificationVisible = true;

  // Note: Window is shown via IPC 'notification:preload-complete' from renderer
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
      displayNotification(next.payload);
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
  const newWidth = Math.min(width, NOTIFICATION_WIDTH_MEDIA);
  const newHeight = Math.min(height, NOTIFICATION_HEIGHT_IMAGE);

  notificationWindow.setSize(newWidth, newHeight);
  notificationWindow.setPosition(
    screenWidth - newWidth - NOTIFICATION_MARGIN,
    NOTIFICATION_MARGIN
  );
}

/**
 * Create and show the main settings window
 */
function createSettingsWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 500,
    height: 450,
    title: 'CreaBomber Client',
    resizable: false,
    minimizable: true,
    maximizable: false,
    fullscreenable: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js'),
    },
  });

  // Load settings HTML
  const settingsPath = app.isPackaged
    ? path.join(process.resourcesPath, 'renderer', 'settings.html')
    : path.join(__dirname, '../../src/renderer/settings.html');

  window.loadFile(settingsPath);

  // Show when ready
  window.once('ready-to-show', () => {
    window.show();
  });

  // Don't quit on close, just hide (macOS behavior)
  window.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      window.hide();
    }
  });

  return window;
}

/**
 * Show settings window
 */
function showSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
  } else {
    settingsWindow = createSettingsWindow();
  }
}

/**
 * Setup IPC handlers for renderer communication
 */
function setupIPCHandlers(): void {
  // Handle close button click from renderer
  ipcMain.on('notification:close', () => {
    hideNotification();
  });

  // Handle preload complete - show window after media is loaded
  ipcMain.on('notification:preload-complete', () => {
    if (notificationWindow && isNotificationVisible) {
      console.log('[Main] Preload complete, showing notification window');
      notificationWindow.show();
    }
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

  // Settings IPC handlers
  ipcMain.handle('settings:get', () => {
    return {
      deviceName: getDeviceName(),
      serverUrl: getServerUrl(),
      connectionStatus: getConnectionStatus(),
      openAtLogin: getOpenAtLogin(),
    };
  });

  ipcMain.handle('settings:save', (_event, settings: { deviceName?: string; serverUrl: string; openAtLogin?: boolean }) => {
    const currentDeviceName = getDeviceName();
    const currentUrl = getServerUrl();
    const currentOpenAtLogin = getOpenAtLogin();
    let needsReconnect = false;

    if (settings.deviceName && settings.deviceName !== currentDeviceName) {
      setDeviceName(settings.deviceName);
      needsReconnect = true;
    }

    if (settings.serverUrl && settings.serverUrl !== currentUrl) {
      setServerUrl(settings.serverUrl);
      needsReconnect = true;
    }

    if (needsReconnect) {
      reconnect();
    }

    if (typeof settings.openAtLogin === 'boolean' && settings.openAtLogin !== currentOpenAtLogin) {
      setOpenAtLogin(settings.openAtLogin);
      app.setLoginItemSettings({
        openAtLogin: settings.openAtLogin,
        openAsHidden: true,
      });
    }

    return { success: true };
  });

  ipcMain.on('settings:close', () => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.hide();
    }
  });
}

/**
 * Create application menu (for macOS)
 */
function createAppMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { label: 'About CreaBomber', role: 'about' },
        { type: 'separator' },
        {
          label: 'Settings...',
          accelerator: 'CmdOrCtrl+,',
          click: () => showSettingsWindow(),
        },
        { type: 'separator' },
        { label: 'Hide CreaBomber', role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { label: 'Quit CreaBomber', role: 'quit' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Check and display scheduled messages from Supabase
 */
async function checkScheduledMessages(): Promise<void> {
  // Skip if Supabase is not configured
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.log('[Main] Supabase not configured, skipping scheduled messages');
    return;
  }

  try {
    // Initialize Supabase client
    initSupabase(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Get device ID
    const deviceInfo = getDeviceInfo();
    console.log(`[Main] Checking scheduled messages for device: ${deviceInfo.id}`);

    // Process scheduled messages
    const payloads = await processScheduledMessages(deviceInfo.id);

    if (payloads.length === 0) {
      console.log('[Main] No scheduled messages for today');
      return;
    }

    console.log(`[Main] Found ${payloads.length} scheduled message(s)`);

    // Show each scheduled message with a delay between them
    for (let i = 0; i < payloads.length; i++) {
      const payload = payloads[i];

      // Convert to MessagePayload format
      const messagePayload: MessagePayload = {
        id: payload.id,
        type: payload.type as MessagePayload['type'],
        content: payload.content,
        imageUrl: payload.imageUrl,
        videoUrl: payload.videoUrl,
        audioUrl: payload.audioUrl,
        audioAutoplay: payload.audioAutoplay,
        targetDevices: [], // Already filtered by processScheduledMessages
        timestamp: Date.now(),
      };

      // Delay between multiple notifications
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      showNotification(messagePayload);
    }
  } catch (error) {
    console.error('[Main] Error checking scheduled messages:', error);
  }
}

/**
 * Initialize the application
 */
async function initialize(): Promise<void> {
  console.log('[Main] Initializing CreaBomber client...');

  // Hide dock icon for pre-configured clients (tray-only mode)
  if (process.platform === 'darwin' && isPreconfigured() && app.dock) {
    app.dock.hide();
    console.log('[Main] Dock icon hidden (pre-configured client)');
  }

  // Setup IPC handlers
  setupIPCHandlers();

  // Create application menu
  createAppMenu();

  // Create notification window (hidden)
  notificationWindow = createNotificationWindow();

  // Initialize system tray
  initializeTray();

  // Only show settings window on first run
  if (isFirstRun()) {
    console.log('[Main] First run detected - showing settings window');
    settingsWindow = createSettingsWindow();
  }

  // Connect to dashboard WebSocket server
  connect();

  // Check for scheduled messages after a short delay
  // (gives the notification window time to fully initialize)
  setTimeout(() => {
    checkScheduledMessages();
  }, 3000);

  console.log('[Main] CreaBomber client initialized');
}

// Track if app is quitting
declare global {
  namespace Electron {
    interface App {
      isQuitting?: boolean;
    }
  }
}

/**
 * App lifecycle events
 */
app.whenReady().then(() => {
  initialize();

  // macOS: Show settings window when dock icon clicked (only for non-preconfigured clients)
  app.on('activate', () => {
    if (!isPreconfigured()) {
      showSettingsWindow();
    }
  });
});

// Prevent quit when closing windows on macOS
app.on('window-all-closed', () => {
  // Don't quit on macOS, app stays in background
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Mark that we're quitting so windows can close properly
app.on('before-quit', () => {
  app.isQuitting = true;
  prepareForShutdown(); // Disable logging to prevent EPIPE errors
});

// Cleanup on quit
app.on('will-quit', () => {
  if (currentNotificationTimeout) {
    clearTimeout(currentNotificationTimeout);
  }
  destroyTray();
});

// Export for use by socket.ts
export { notificationWindow };
