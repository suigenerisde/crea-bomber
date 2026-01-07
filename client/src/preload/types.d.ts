/**
 * Type declarations for the CreaBomber preload API
 * This file provides TypeScript types for the API exposed via contextBridge
 */

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

// Device info interface
interface DeviceInfo {
  id: string;
  name: string;
  hostname: string;
  platform: string;
  connected: boolean;
}

// Connection status type
type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// Notification callback type
type NotificationCallback = (payload: MessagePayload) => void;
type HideCallback = () => void;

/**
 * CreaBomber API interface
 * Exposed to renderer via contextBridge.exposeInMainWorld('creaBomber', ...)
 */
interface CreaBomberAPI {
  /**
   * Register a callback to receive notifications
   * @param callback Function called when a notification arrives
   * @returns Unsubscribe function to stop receiving notifications
   */
  onNotification: (callback: NotificationCallback) => () => void;

  /**
   * Register a callback for when notification should hide
   * @param callback Function called when notification should be hidden
   * @returns Unsubscribe function
   */
  onHide: (callback: HideCallback) => () => void;

  /**
   * Close/dismiss the current notification
   * Called when user clicks the close button
   */
  closeNotification: () => void;

  /**
   * Request window resize from renderer
   * @param width Desired window width
   * @param height Desired window height
   */
  requestResize: (width: number, height: number) => void;

  /**
   * Get device information
   * @returns Promise resolving to device info object
   */
  getDeviceInfo: () => Promise<DeviceInfo>;

  /**
   * Get current connection status
   * @returns Promise resolving to connection status string
   */
  getConnectionStatus: () => Promise<ConnectionStatus>;

  /**
   * Get server URL
   * @returns Promise resolving to server URL string
   */
  getServerUrl: () => Promise<string>;

  // === Settings Window API ===

  /**
   * Get all settings (for settings window)
   * @returns Promise resolving to settings object with serverUrl, connectionStatus, and openAtLogin
   */
  getSettings: () => Promise<{ serverUrl: string; connectionStatus: ConnectionStatus; openAtLogin: boolean }>;

  /**
   * Save settings (for settings window)
   * @param settings Object containing settings to save
   * @returns Promise resolving to success indicator
   */
  saveSettings: (settings: { serverUrl: string; openAtLogin?: boolean }) => Promise<{ success: boolean }>;

  /**
   * Close settings window
   */
  closeSettings: () => void;
}

// Extend the Window interface to include the creaBomber API
declare global {
  interface Window {
    creaBomber: CreaBomberAPI;
  }
}

export {
  MessagePayload,
  DeviceInfo,
  ConnectionStatus,
  NotificationCallback,
  HideCallback,
  CreaBomberAPI,
};
