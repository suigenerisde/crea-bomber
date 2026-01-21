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

// Flag to disable logging during shutdown (prevents EPIPE errors)
let isShuttingDown = false;

// Call this before app quits to prevent EPIPE errors
export function prepareForShutdown(): void {
  isShuttingDown = true;
}

// Safe console log that doesn't throw on closed pipe
function safeLog(...args: unknown[]): void {
  if (isShuttingDown) return;
  try {
    console.log(...args);
  } catch {
    // Ignore any logging errors
  }
}

// Configuration
// Priority: bundled config > env var > development mode > production default

// Try to load bundled device config (for pre-configured family clients)
interface BundledConfig {
  deviceId?: string;
  deviceName?: string;
  serverUrl?: string;
}

function loadBundledConfig(): BundledConfig {
  try {
    // In production, resources are in app.asar/../ or process.resourcesPath
    const resourcesPath = process.resourcesPath || path.dirname(app.getAppPath());
    const configPath = path.join(resourcesPath, 'device-config.json');

    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configData) as BundledConfig;
      console.log('[Socket] Loaded bundled device config:', config.deviceName || 'unnamed');
      return config;
    }
  } catch (error) {
    console.log('[Socket] No bundled config found, using defaults');
  }
  return {};
}

const bundledConfig = loadBundledConfig();

// Production: VPS server at bomber.suimation.de
// Development: localhost:3000
const DEFAULT_SERVER_URL = bundledConfig.serverUrl || process.env.SERVER_URL || (
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://bomber.suimation.de'
);
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds

// Pre-configured device settings (from bundled config or environment variables)
// If these are set, the client is considered "pre-configured" and won't show settings
const PRECONFIGURED_DEVICE_ID = bundledConfig.deviceId || process.env.DEVICE_ID || '';
const PRECONFIGURED_DEVICE_NAME = bundledConfig.deviceName || process.env.DEVICE_NAME || '';

/**
 * Check if this client is pre-configured (has hardcoded device ID/name)
 */
export function isPreconfigured(): boolean {
  return !!(PRECONFIGURED_DEVICE_ID && PRECONFIGURED_DEVICE_NAME);
}

// Store schema for persistent device settings
interface StoreSchema {
  deviceId: string;
  deviceName: string;
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
      deviceName: '',
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
 * If preconfigured, always use the hardcoded ID
 */
function getDeviceId(): string {
  // Use preconfigured ID if available
  if (PRECONFIGURED_DEVICE_ID) {
    return PRECONFIGURED_DEVICE_ID;
  }

  const storage = getStore();
  let deviceId = storage.get('deviceId');

  if (!deviceId) {
    deviceId = uuidv4();
    storage.set('deviceId', deviceId);
    safeLog(`[Socket] Generated new device ID: ${deviceId}`);
  }

  return deviceId;
}

/**
 * Get or generate a default device name
 */
function getDefaultDeviceName(): string {
  // Create a friendly name from hostname
  const hostname = os.hostname();
  // Remove common suffixes and clean up
  const cleanName = hostname
    .replace(/\.local$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase()); // Title case
  return cleanName;
}

/**
 * Get the device name from store or generate default
 * If preconfigured, always use the hardcoded name
 */
export function getDeviceName(): string {
  // Use preconfigured name if available
  if (PRECONFIGURED_DEVICE_NAME) {
    return PRECONFIGURED_DEVICE_NAME;
  }

  const storage = getStore();
  let deviceName = storage.get('deviceName');

  if (!deviceName) {
    deviceName = getDefaultDeviceName();
    storage.set('deviceName', deviceName);
    safeLog(`[Socket] Generated default device name: ${deviceName}`);
  }

  return deviceName;
}

/**
 * Set a custom device name
 */
export function setDeviceName(name: string): void {
  getStore().set('deviceName', name);
  safeLog(`[Socket] Device name updated: ${name}`);
}

/**
 * Get device information
 */
export function getDeviceInfo(): DeviceInfo {
  return {
    id: getDeviceId(),
    name: getDeviceName(),
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
    safeLog(`[Socket] Connection status: ${status}`);
    statusCallbacks.forEach(cb => cb(status));
  }
}

/**
 * Get the server URL
 * Priority: bundled config > env var > store
 */
export function getServerUrl(): string {
  // Bundled config takes priority for pre-configured clients
  if (bundledConfig.serverUrl) {
    return bundledConfig.serverUrl;
  }
  // Environment variable next
  if (process.env.SERVER_URL) {
    return process.env.SERVER_URL;
  }
  return getStore().get('serverUrl');
}

/**
 * Set the server URL
 */
export function setServerUrl(url: string): void {
  getStore().set('serverUrl', url);
  safeLog(`[Socket] Server URL updated: ${url}`);
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
  safeLog(`[Socket] Open at login updated: ${enabled}`);
}

/**
 * Check if this is the first run (no device name has been set by user)
 * Preconfigured clients are never considered "first run"
 */
export function isFirstRun(): boolean {
  // Preconfigured clients never need setup
  if (isPreconfigured()) {
    return false;
  }

  const storage = getStore();
  // If deviceName is empty or matches the auto-generated hostname name, it's first run
  const deviceName = storage.get('deviceName');
  return !deviceName || deviceName === getDefaultDeviceName();
}

/**
 * Mark first run as complete (called after user saves settings)
 */
export function markFirstRunComplete(): void {
  // This is implicit - once user saves a custom name, isFirstRun returns false
  safeLog('[Socket] First run setup complete');
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
      safeLog('[Socket] Heartbeat sent');
    }
  }, HEARTBEAT_INTERVAL);

  safeLog(`[Socket] Heartbeat started (every ${HEARTBEAT_INTERVAL / 1000}s)`);
}

/**
 * Stop the heartbeat interval
 */
function stopHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    safeLog('[Socket] Heartbeat stopped');
  }
}

/**
 * Schedule a reconnection attempt with exponential backoff
 */
function scheduleReconnect(): void {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }

  safeLog(`[Socket] Scheduling reconnect in ${reconnectDelay / 1000}s`);

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
    safeLog('[Socket] Already connected or connecting');
    return;
  }

  const serverUrl = getServerUrl();
  const deviceInfo = getDeviceInfo();

  safeLog(`[Socket] Connecting to ${serverUrl}...`);
  setConnectionStatus('connecting');

  // Create socket connection
  socket = io(serverUrl, {
    transports: ['websocket', 'polling'],
    reconnection: false, // We handle reconnection manually
    timeout: 10000,
  });

  // Connection established
  socket.on('connect', () => {
    safeLog('[Socket] Connected to server');
    setConnectionStatus('connected');
    resetReconnectDelay();

    // Register device
    socket!.emit('device:register', {
      deviceId: deviceInfo.id,
      deviceName: deviceInfo.name,
      hostname: deviceInfo.hostname,
    });

    safeLog(`[Socket] Device registered: ${deviceInfo.id}`);

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
    safeLog(`[Socket] Disconnected: ${reason}`);
    setConnectionStatus('disconnected');
    stopHeartbeat();

    // Reconnect unless intentionally disconnected
    if (reason !== 'io client disconnect') {
      scheduleReconnect();
    }
  });

  // Receive message from server
  socket.on('message:receive', (payload: MessagePayload) => {
    safeLog(`[Socket] Message received: ${payload.id} (type: ${payload.type})`);

    // Check if this device is a target
    const deviceId = getDeviceId();
    if (payload.targetDevices.length === 0 || payload.targetDevices.includes(deviceId)) {
      showNotification(payload);

      // Acknowledge delivery to server
      socket!.emit('message:delivered', {
        messageId: payload.id,
        deviceId: deviceId,
        timestamp: Date.now(),
      });
      safeLog(`[Socket] Delivery acknowledged for message: ${payload.id}`);
    } else {
      safeLog('[Socket] Message not targeted at this device, ignoring');
    }
  });

  // Device registration acknowledged (server sends { device } object on success)
  socket.on('device:registered', (data: { device?: unknown }) => {
    if (data.device) {
      safeLog('[Socket] Device registration acknowledged by server');
    } else {
      safeLog('[Socket] Device registration acknowledged');
    }
  });

  // Server requesting re-registration (e.g., after server restart)
  socket.on('device:reregister', () => {
    safeLog('[Socket] Server requested re-registration');
    const info = getDeviceInfo();
    socket!.emit('device:register', {
      deviceId: info.id,
      deviceName: info.name,
      hostname: info.hostname,
    });
  });
}

/**
 * Disconnect from the server
 */
export function disconnect(): void {
  safeLog('[Socket] Disconnecting...');

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
  safeLog('[Socket] Disconnected');
}

/**
 * Reconnect to the server (disconnect then connect)
 */
export function reconnect(): void {
  safeLog('[Socket] Reconnecting...');
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
