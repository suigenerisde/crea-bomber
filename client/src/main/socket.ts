/**
 * CreaBomber WebSocket Connection Manager
 * Handles device registration, heartbeat, and message receiving
 */

import { io, Socket } from 'socket.io-client';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { showNotification } from './main';

// Configuration
const DEFAULT_SERVER_URL = 'http://localhost:3000';
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds

// Store schema for persistent device settings
interface StoreSchema {
  deviceId: string;
  serverUrl: string;
  notificationDuration: number;
  soundEnabled: boolean;
  openAtLogin: boolean;
}

// Device info interface
export interface DeviceInfo {
  id: string;
  name: string;
  hostname: string;
  platform: string;
  connected: boolean;
}

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

// Connection status type
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// Connection status change callback
type StatusCallback = (status: ConnectionStatus) => void;

// Simple file-based persistent store (electron-store v11 is ESM-only)
class SimpleStore {
  private filePath: string;
  private data: StoreSchema;
  private defaults: StoreSchema;

  constructor(defaults: StoreSchema) {
    this.defaults = defaults;
    const userDataPath = app.getPath('userData');
    this.filePath = path.join(userDataPath, 'config.json');
    this.data = this.load();
  }

  private load(): StoreSchema {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        return { ...this.defaults, ...JSON.parse(raw) };
      }
    } catch (error) {
      console.error('[Store] Error loading config:', error);
    }
    return { ...this.defaults };
  }

  private save(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('[Store] Error saving config:', error);
    }
  }

  get<K extends keyof StoreSchema>(key: K): StoreSchema[K] {
    return this.data[key];
  }

  set<K extends keyof StoreSchema>(key: K, value: StoreSchema[K]): void {
    this.data[key] = value;
    this.save();
  }
}

// Persistent store for device settings (initialized lazily after app is ready)
let store: SimpleStore | null = null;

function getStore(): SimpleStore {
  if (!store) {
    store = new SimpleStore({
      deviceId: '',
      serverUrl: DEFAULT_SERVER_URL,
      notificationDuration: 8000,
      soundEnabled: true,
      openAtLogin: false,
    });
  }
  return store;
}

// Module state
let socket: Socket | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectDelay = INITIAL_RECONNECT_DELAY;
let connectionStatus: ConnectionStatus = 'disconnected';
let statusCallbacks: StatusCallback[] = [];

/**
 * Get or create a persistent device ID
 */
function getDeviceId(): string {
  const storage = getStore();
  let deviceId = storage.get('deviceId');

  if (!deviceId) {
    deviceId = uuidv4();
    storage.set('deviceId', deviceId);
    console.log(`[Socket] Generated new device ID: ${deviceId}`);
  }

  return deviceId;
}

/**
 * Get device information
 */
export function getDeviceInfo(): DeviceInfo {
  return {
    id: getDeviceId(),
    name: `${os.hostname()}-${os.platform()}`,
    hostname: os.hostname(),
    platform: os.platform(),
    connected: connectionStatus === 'connected',
  };
}

/**
 * Get current connection status
 */
export function getConnectionStatus(): ConnectionStatus {
  return connectionStatus;
}

/**
 * Subscribe to connection status changes
 */
export function onStatusChange(callback: StatusCallback): () => void {
  statusCallbacks.push(callback);
  // Return unsubscribe function
  return () => {
    statusCallbacks = statusCallbacks.filter(cb => cb !== callback);
  };
}

/**
 * Update connection status and notify subscribers
 */
function setConnectionStatus(status: ConnectionStatus): void {
  if (connectionStatus !== status) {
    connectionStatus = status;
    console.log(`[Socket] Connection status: ${status}`);
    statusCallbacks.forEach(cb => cb(status));
  }
}

/**
 * Get the server URL from store
 */
export function getServerUrl(): string {
  return getStore().get('serverUrl');
}

/**
 * Set the server URL
 */
export function setServerUrl(url: string): void {
  getStore().set('serverUrl', url);
  console.log(`[Socket] Server URL updated: ${url}`);
}

/**
 * Get the openAtLogin setting from store
 */
export function getOpenAtLogin(): boolean {
  return getStore().get('openAtLogin');
}

/**
 * Set the openAtLogin setting
 */
export function setOpenAtLogin(enabled: boolean): void {
  getStore().set('openAtLogin', enabled);
  console.log(`[Socket] Open at login updated: ${enabled}`);
}

/**
 * Start the heartbeat interval
 */
function startHeartbeat(): void {
  stopHeartbeat();

  heartbeatInterval = setInterval(() => {
    if (socket && socket.connected) {
      const deviceInfo = getDeviceInfo();
      socket.emit('device:heartbeat', {
        deviceId: deviceInfo.id,
        timestamp: Date.now(),
      });
      console.log('[Socket] Heartbeat sent');
    }
  }, HEARTBEAT_INTERVAL);

  console.log(`[Socket] Heartbeat started (every ${HEARTBEAT_INTERVAL / 1000}s)`);
}

/**
 * Stop the heartbeat interval
 */
function stopHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log('[Socket] Heartbeat stopped');
  }
}

/**
 * Schedule a reconnection attempt with exponential backoff
 */
function scheduleReconnect(): void {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }

  console.log(`[Socket] Scheduling reconnect in ${reconnectDelay / 1000}s`);

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connect();
  }, reconnectDelay);

  // Exponential backoff with max limit
  reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
}

/**
 * Reset reconnect delay (call on successful connection)
 */
function resetReconnectDelay(): void {
  reconnectDelay = INITIAL_RECONNECT_DELAY;
}

/**
 * Connect to the dashboard WebSocket server
 */
export function connect(): void {
  // Don't connect if already connected or connecting
  if (socket && (socket.connected || connectionStatus === 'connecting')) {
    console.log('[Socket] Already connected or connecting');
    return;
  }

  const serverUrl = getServerUrl();
  const deviceInfo = getDeviceInfo();

  console.log(`[Socket] Connecting to ${serverUrl}...`);
  setConnectionStatus('connecting');

  // Create socket connection
  socket = io(serverUrl, {
    transports: ['websocket', 'polling'],
    reconnection: false, // We handle reconnection manually
    timeout: 10000,
  });

  // Connection established
  socket.on('connect', () => {
    console.log('[Socket] Connected to server');
    setConnectionStatus('connected');
    resetReconnectDelay();

    // Register device
    socket!.emit('device:register', {
      deviceId: deviceInfo.id,
      name: deviceInfo.name,
      hostname: deviceInfo.hostname,
      platform: deviceInfo.platform,
      version: '1.0.0',
    });

    console.log(`[Socket] Device registered: ${deviceInfo.id}`);

    // Start heartbeat
    startHeartbeat();
  });

  // Connection error
  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
    setConnectionStatus('error');
    stopHeartbeat();
    scheduleReconnect();
  });

  // Disconnected
  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Disconnected: ${reason}`);
    setConnectionStatus('disconnected');
    stopHeartbeat();

    // Reconnect unless intentionally disconnected
    if (reason !== 'io client disconnect') {
      scheduleReconnect();
    }
  });

  // Receive message from server
  socket.on('message:receive', (payload: MessagePayload) => {
    console.log(`[Socket] Message received: ${payload.id} (type: ${payload.type})`);

    // Check if this device is a target
    const deviceId = getDeviceId();
    if (payload.targetDevices.length === 0 || payload.targetDevices.includes(deviceId)) {
      showNotification(payload);
    } else {
      console.log('[Socket] Message not targeted at this device, ignoring');
    }
  });

  // Device registration acknowledged
  socket.on('device:registered', (data: { success: boolean; message?: string }) => {
    if (data.success) {
      console.log('[Socket] Device registration acknowledged');
    } else {
      console.error('[Socket] Device registration failed:', data.message);
    }
  });

  // Server requesting re-registration (e.g., after server restart)
  socket.on('device:reregister', () => {
    console.log('[Socket] Server requested re-registration');
    const info = getDeviceInfo();
    socket!.emit('device:register', {
      deviceId: info.id,
      name: info.name,
      hostname: info.hostname,
      platform: info.platform,
      version: '1.0.0',
    });
  });
}

/**
 * Disconnect from the server
 */
export function disconnect(): void {
  console.log('[Socket] Disconnecting...');

  stopHeartbeat();

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  setConnectionStatus('disconnected');
  console.log('[Socket] Disconnected');
}

/**
 * Reconnect to the server (disconnect then connect)
 */
export function reconnect(): void {
  console.log('[Socket] Reconnecting...');
  disconnect();
  resetReconnectDelay();
  connect();
}

/**
 * Check if currently connected
 */
export function isConnected(): boolean {
  return socket !== null && socket.connected;
}

/**
 * Get the underlying socket instance (for advanced use)
 */
export function getSocket(): Socket | null {
  return socket;
}
