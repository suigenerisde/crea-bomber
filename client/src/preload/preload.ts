/**
 * CreaBomber Preload Script
 * Exposes safe IPC bridge to renderer using contextBridge
 *
 * This script runs in an isolated context before the renderer loads.
 * It provides a secure API for the renderer to communicate with the main process.
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

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

// Store callbacks for cleanup
let notificationCallback: NotificationCallback | null = null;
let hideCallback: HideCallback | null = null;

/**
 * CreaBomber API exposed to the renderer
 */
const creaBomberAPI = {
  /**
   * Register a callback to receive notifications
   * Returns an unsubscribe function
   */
  onNotification: (callback: NotificationCallback): (() => void) => {
    notificationCallback = callback;

    const handler = (_event: IpcRendererEvent, payload: MessagePayload) => {
      if (notificationCallback) {
        notificationCallback(payload);
      }
    };

    ipcRenderer.on('notification:show', handler);

    // Return unsubscribe function
    return () => {
      notificationCallback = null;
      ipcRenderer.removeListener('notification:show', handler);
    };
  },

  /**
   * Register a callback for when notification should hide
   * Returns an unsubscribe function
   */
  onHide: (callback: HideCallback): (() => void) => {
    hideCallback = callback;

    const handler = () => {
      if (hideCallback) {
        hideCallback();
      }
    };

    ipcRenderer.on('notification:hide', handler);

    // Return unsubscribe function
    return () => {
      hideCallback = null;
      ipcRenderer.removeListener('notification:hide', handler);
    };
  },

  /**
   * Close/dismiss the current notification
   * Called when user clicks the close button
   */
  closeNotification: (): void => {
    ipcRenderer.send('notification:close');
  },

  /**
   * Request window resize from renderer
   * Used when displaying media content that needs different dimensions
   */
  requestResize: (width: number, height: number): void => {
    ipcRenderer.send('notification:resize', { width, height });
  },

  /**
   * Get device information
   * Returns device ID, name, hostname, platform, and connection status
   */
  getDeviceInfo: async (): Promise<DeviceInfo> => {
    return ipcRenderer.invoke('device:getInfo');
  },

  /**
   * Get current connection status
   */
  getConnectionStatus: async (): Promise<ConnectionStatus> => {
    return ipcRenderer.invoke('connection:getStatus');
  },

  /**
   * Get server URL
   */
  getServerUrl: async (): Promise<string> => {
    return ipcRenderer.invoke('connection:getServerUrl');
  },
};

// Expose the API to the renderer window
contextBridge.exposeInMainWorld('creaBomber', creaBomberAPI);

// Export types for TypeScript consumers
export type { MessagePayload, DeviceInfo, ConnectionStatus, NotificationCallback, HideCallback };
export type CreaBomberAPI = typeof creaBomberAPI;
