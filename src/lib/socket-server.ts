/**
 * CreaBomber Socket.io Server
 * Handles real-time communication between dashboard and display devices
 */

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import {
  getDevices,
  updateDeviceStatus,
  upsertDevice,
  createMessage,
  updateMessageStatus,
  createMessageDeliveries,
  updateDeliveryStatus,
  recalculateMessageStatus,
  getMessageWithDeliveries,
} from './db';
import type {
  DeviceRegistration,
  MessagePayload,
  Device,
  MessageType,
  DeliveryAckPayload,
  DeliveryStatusUpdate,
} from '@/types';

// Store socket-to-device mapping
const socketDeviceMap = new Map<string, string>();

// Timeout for marking devices offline (45 seconds without heartbeat)
// Note: Client heartbeat is every 30s, so 45s gives buffer for network latency
const OFFLINE_TIMEOUT = 45000;

// Track heartbeat timeouts per device
const heartbeatTimeouts = new Map<string, NodeJS.Timeout>();

let io: Server | null = null;

/**
 * Initialize Socket.io server with the given HTTP server
 * @param httpServer - HTTP server to attach to
 * @param corsOrigins - Array of allowed CORS origins
 */
export function initSocketServer(httpServer: HttpServer, corsOrigins?: string[]): Server {
  const origins = corsOrigins || ['http://localhost:3000', 'http://127.0.0.1:3000'];

  io = new Server(httpServer, {
    cors: {
      origin: origins,
      methods: ['GET', 'POST'],
    },
    // Connection settings for reliable internal network communication
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Handle device registration
    socket.on('device:register', (data: DeviceRegistration) => {
      handleDeviceRegister(socket, data);
    });

    // Handle heartbeat
    socket.on('device:heartbeat', () => {
      handleDeviceHeartbeat(socket);
    });

    // Handle message sending
    socket.on('message:send', (payload: MessagePayload) => {
      handleMessageSend(socket, payload);
    });

    // Handle message delivery acknowledgment from client
    socket.on('message:delivered', (payload: DeliveryAckPayload) => {
      handleMessageDelivered(socket, payload);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      handleDisconnect(socket);
    });
  });

  console.log('[Socket] Socket.io server initialized');
  return io;
}

/**
 * Handle device registration
 * - Upsert device in database
 * - Join device to its room
 * - Broadcast updated device list
 */
function handleDeviceRegister(socket: Socket, data: DeviceRegistration): void {
  const { deviceId, deviceName, hostname } = data;

  console.log(`[Socket] Device registering: ${deviceName} (${deviceId})`);

  // Upsert device in database (creates if new, updates if existing)
  const device = upsertDevice(deviceId, deviceName, hostname);

  // Map socket to device
  socketDeviceMap.set(socket.id, deviceId);

  // Join device room
  socket.join(`device:${deviceId}`);

  // Clear any existing offline timeout
  clearDeviceTimeout(deviceId);

  // Start heartbeat timeout
  resetHeartbeatTimeout(deviceId);

  // Notify client of successful registration
  socket.emit('device:registered', { device });

  // Broadcast updated device list to all clients
  broadcastDeviceList();
}

/**
 * Handle device heartbeat
 * - Update lastSeen timestamp
 * - Reset offline timeout
 */
function handleDeviceHeartbeat(socket: Socket): void {
  const deviceId = socketDeviceMap.get(socket.id);

  if (!deviceId) {
    console.warn(`[Socket] Heartbeat from unregistered socket: ${socket.id}`);
    return;
  }

  // Update device status and lastSeen
  updateDeviceStatus(deviceId, 'online', true);

  // Reset heartbeat timeout
  resetHeartbeatTimeout(deviceId);
}

/**
 * Handle message sending
 * - Save message to database
 * - Create delivery records for each target device
 * - Broadcast to target device rooms
 * - Update message status
 */
function handleMessageSend(socket: Socket, payload: MessagePayload): void {
  const { id, type, content, targetDevices, imageUrl, videoUrl, audioUrl, audioAutoplay } = payload;

  console.log(`[Socket] Message received: ${id} -> ${targetDevices.join(', ')}`);

  // Save message to database
  const message = createMessage(type as MessageType, content, targetDevices, {
    imageUrl,
    videoUrl,
    audioUrl,
    audioAutoplay,
  });

  // Create delivery records for each target device
  createMessageDeliveries(message.id, targetDevices, 'sent');

  // Emit to each target device room
  for (const deviceId of targetDevices) {
    if (io) {
      io.to(`device:${deviceId}`).emit('message:receive', {
        ...payload,
        id: message.id,
        timestamp: message.createdAt.getTime(),
      });
    }
  }

  // Update message status to sent
  updateMessageStatus(message.id, 'sent');

  // Notify sender of successful send
  socket.emit('message:sent', { messageId: message.id });
}

/**
 * Handle message delivery acknowledgment from client
 * - Update delivery status for the specific device
 * - Recalculate overall message status
 * - Broadcast delivery status update to dashboard
 */
function handleMessageDelivered(socket: Socket, payload: DeliveryAckPayload): void {
  const { messageId, deviceId, timestamp } = payload;

  console.log(`[Socket] Delivery acknowledged: ${messageId} by device ${deviceId}`);

  // Update delivery status in database
  const updated = updateDeliveryStatus(messageId, deviceId, 'delivered', timestamp);

  if (!updated) {
    console.warn(`[Socket] Failed to update delivery status for message ${messageId}, device ${deviceId}`);
    return;
  }

  // Recalculate and update overall message status
  const overallStatus = recalculateMessageStatus(messageId);

  // Get updated message with deliveries
  const message = getMessageWithDeliveries(messageId);

  // Broadcast delivery status update to all dashboard clients
  if (io) {
    const statusUpdate: DeliveryStatusUpdate = {
      messageId,
      deviceId,
      status: 'delivered',
      timestamp,
      overallStatus,
    };

    io.emit('message:delivery:update', statusUpdate);

    // Also broadcast the full updated message for dashboard to update its state
    if (message) {
      io.emit('message:updated', { message });
    }
  }

  console.log(`[Socket] Message ${messageId} overall status: ${overallStatus}`);
}

/**
 * Handle socket disconnection
 * - Mark device as offline after timeout
 * - Broadcast updated device list
 */
function handleDisconnect(socket: Socket): void {
  const deviceId = socketDeviceMap.get(socket.id);

  console.log(`[Socket] Client disconnected: ${socket.id}`);

  if (deviceId) {
    // Don't immediately mark offline - wait for timeout
    // This allows for brief reconnections
    console.log(`[Socket] Device ${deviceId} disconnected, starting offline timeout`);

    // Set timeout to mark device offline
    const timeout = setTimeout(() => {
      markDeviceOffline(deviceId);
    }, OFFLINE_TIMEOUT);

    heartbeatTimeouts.set(deviceId, timeout);

    // Clean up socket mapping
    socketDeviceMap.delete(socket.id);
  }
}

/**
 * Mark a device as offline and broadcast update
 */
function markDeviceOffline(deviceId: string): void {
  console.log(`[Socket] Marking device offline: ${deviceId}`);

  updateDeviceStatus(deviceId, 'offline', false);
  clearDeviceTimeout(deviceId);
  broadcastDeviceList();
}

/**
 * Reset the heartbeat timeout for a device
 */
function resetHeartbeatTimeout(deviceId: string): void {
  clearDeviceTimeout(deviceId);

  const timeout = setTimeout(() => {
    console.log(`[Socket] Heartbeat timeout for device: ${deviceId}`);
    markDeviceOffline(deviceId);
  }, OFFLINE_TIMEOUT);

  heartbeatTimeouts.set(deviceId, timeout);
}

/**
 * Clear any existing timeout for a device
 */
function clearDeviceTimeout(deviceId: string): void {
  const existing = heartbeatTimeouts.get(deviceId);
  if (existing) {
    clearTimeout(existing);
    heartbeatTimeouts.delete(deviceId);
  }
}

/**
 * Broadcast the current device list to all connected clients
 */
function broadcastDeviceList(): void {
  if (!io) return;

  const devices = getDevices();
  io.emit('devices:update', { devices });
}

/**
 * Get the Socket.io server instance
 */
export function getSocketServer(): Server | null {
  return io;
}

/**
 * Emit an event to a specific device
 */
export function emitToDevice(deviceId: string, event: string, data: unknown): void {
  if (io) {
    io.to(`device:${deviceId}`).emit(event, data);
  }
}

/**
 * Emit an event to all connected clients
 */
export function emitToAll(event: string, data: unknown): void {
  if (io) {
    io.emit(event, data);
  }
}
