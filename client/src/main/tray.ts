/**
 * CreaBomber System Tray Integration
 * Provides tray icon, menu, and settings window
 */

import { Tray, Menu, nativeImage, BrowserWindow, ipcMain, app, shell } from 'electron';
import * as path from 'path';
import {
  getConnectionStatus,
  getServerUrl,
  setServerUrl,
  getDeviceName,
  setDeviceName,
  getOpenAtLogin,
  setOpenAtLogin,
  onStatusChange,
  reconnect,
  ConnectionStatus,
  prepareForShutdown,
} from './socket';

// Flag to disable logging during shutdown
let isShuttingDown = false;

// Safe console log that doesn't throw on closed pipe
function safeLog(...args: unknown[]): void {
  if (isShuttingDown) return;
  try {
    console.log(...args);
  } catch {
    // Ignore EPIPE errors when process is shutting down
  }
}

// Tray icon size (macOS standard)
const ICON_SIZE = 22;

// Tray instance
let tray: Tray | null = null;
let settingsWindow: BrowserWindow | null = null;

/**
 * Create a colored circle icon for connection status
 * @param color - The fill color for the icon
 */
function createStatusIcon(color: string): Electron.NativeImage {
  // Create SVG circle icon as data URL (more reliable on macOS)
  const svg = `<svg width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 ${ICON_SIZE} ${ICON_SIZE}" xmlns="http://www.w3.org/2000/svg"><circle cx="${ICON_SIZE / 2}" cy="${ICON_SIZE / 2}" r="${ICON_SIZE / 2 - 2}" fill="${color}"/></svg>`;

  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  const image = nativeImage.createFromDataURL(dataUrl);

  // Resize for proper display on macOS menu bar
  return image.resize({ width: ICON_SIZE, height: ICON_SIZE });
}

/**
 * Get the appropriate icon color for connection status
 */
function getIconColorForStatus(status: ConnectionStatus): string {
  switch (status) {
    case 'connected':
      return '#22c55e'; // Green
    case 'connecting':
      return '#f59e0b'; // Amber/Yellow
    case 'disconnected':
      return '#6b7280'; // Gray
    case 'error':
      return '#ef4444'; // Red
    default:
      return '#6b7280'; // Gray
  }
}

/**
 * Get tooltip text for connection status
 */
function getTooltipForStatus(status: ConnectionStatus): string {
  switch (status) {
    case 'connected':
      return 'CreaBomber - Connected';
    case 'connecting':
      return 'CreaBomber - Connecting...';
    case 'disconnected':
      return 'CreaBomber - Disconnected';
    case 'error':
      return 'CreaBomber - Connection Error';
    default:
      return 'CreaBomber';
  }
}

/**
 * Get status text for menu item
 */
function getStatusText(status: ConnectionStatus): string {
  const serverUrl = getServerUrl();
  switch (status) {
    case 'connected':
      return `Connected to ${serverUrl}`;
    case 'connecting':
      return `Connecting to ${serverUrl}...`;
    case 'disconnected':
      return 'Disconnected';
    case 'error':
      return 'Connection Error';
    default:
      return 'Unknown Status';
  }
}

/**
 * Build the tray context menu
 */
function buildTrayMenu(): Menu {
  const status = getConnectionStatus();
  const isConnected = status === 'connected';

  return Menu.buildFromTemplate([
    {
      label: getStatusText(status),
      enabled: false,
      icon: createStatusIcon(getIconColorForStatus(status)),
    },
    { type: 'separator' },
    {
      label: 'Reconnect',
      click: () => {
        safeLog('[Tray] Reconnect clicked');
        reconnect();
      },
      enabled: status !== 'connecting',
    },
    { type: 'separator' },
    {
      label: 'Settings...',
      click: () => {
        openSettingsWindow();
      },
    },
    { type: 'separator' },
    {
      label: 'Open Dashboard',
      click: () => {
        const serverUrl = getServerUrl();
        shell.openExternal(serverUrl);
      },
      enabled: isConnected,
    },
    { type: 'separator' },
    {
      label: 'Quit CreaBomber',
      click: () => {
        app.quit();
      },
    },
  ]);
}

/**
 * Update the tray icon based on connection status
 */
function updateTrayIcon(status: ConnectionStatus): void {
  if (!tray) return;

  const icon = createStatusIcon(getIconColorForStatus(status));
  tray.setImage(icon);
  tray.setToolTip(getTooltipForStatus(status));

  // Also update the context menu
  tray.setContextMenu(buildTrayMenu());
}

/**
 * Create and show the settings window
 */
function openSettingsWindow(): void {
  // If window already exists, focus it
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 450,
    height: 350,
    title: 'CreaBomber Settings',
    resizable: false,
    minimizable: false,
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

  settingsWindow.loadFile(settingsPath);

  // Show when ready
  settingsWindow.once('ready-to-show', () => {
    settingsWindow?.show();
  });

  // Clean up on close
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  safeLog('[Tray] Settings window opened');
}

/**
 * Apply the login item setting to the system
 */
function applyLoginItemSetting(enabled: boolean): void {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: true, // Start minimized to tray
    path: app.getPath('exe'),
  });
  safeLog(`[Tray] Login item setting applied: ${enabled}`);
}

// Note: IPC handlers for settings are now in main.ts to avoid duplication

/**
 * Initialize the system tray
 */
export function initializeTray(): void {
  safeLog('[Tray] Initializing system tray...');

  // Create initial tray icon
  const initialStatus = getConnectionStatus();
  const icon = createStatusIcon(getIconColorForStatus(initialStatus));

  tray = new Tray(icon);
  tray.setToolTip(getTooltipForStatus(initialStatus));
  tray.setContextMenu(buildTrayMenu());

  // On macOS, clicking the tray icon shows the menu
  // On other platforms, we can add left-click behavior here if needed

  // Subscribe to connection status changes
  onStatusChange((status) => {
    safeLog(`[Tray] Connection status changed: ${status}`);
    updateTrayIcon(status);
  });

  safeLog('[Tray] System tray initialized');
}

/**
 * Destroy the system tray
 */
export function destroyTray(): void {
  isShuttingDown = true; // Disable logging before cleanup

  if (tray) {
    tray.destroy();
    tray = null;
  }

  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close();
    settingsWindow = null;
  }
}

/**
 * Get the tray instance (for advanced use)
 */
export function getTray(): Tray | null {
  return tray;
}
