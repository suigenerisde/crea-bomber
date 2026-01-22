/**
 * CreaBomber Type Definitions
 * Core types for devices, messages, and WebSocket communication
 */

// Message content types
export enum MessageType {
  TEXT = 'TEXT',
  TEXT_IMAGE = 'TEXT_IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
}

// Device status
export type DeviceStatus = 'online' | 'offline';

// Message delivery status (overall status)
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'partial';

// Per-device delivery status
export type DeviceDeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed';

// Per-device delivery tracking
export interface MessageDelivery {
  deviceId: string;
  status: DeviceDeliveryStatus;
  deliveredAt?: Date;
  failedAt?: Date;
  failureReason?: string;
}

// Device representation
export interface Device {
  id: string;
  name: string;
  hostname: string;
  status: DeviceStatus;
  lastSeen: Date;
  createdAt: Date;
}

// Message representation
export interface Message {
  id: string;
  type: MessageType;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  audioAutoplay?: boolean;
  targetDevices: string[];
  status: MessageStatus;
  senderId?: string;
  deliveries?: MessageDelivery[];
  createdAt: Date;
}

// WebSocket payload for message transmission
export interface MessagePayload {
  id: string;
  type: MessageType;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  audioAutoplay?: boolean;
  targetDevices: string[];
  timestamp: number;
}

// Client handshake data for device registration
export interface DeviceRegistration {
  deviceId: string;
  deviceName: string;
  hostname: string;
}

// Database row types (snake_case for SQLite compatibility)
export interface DeviceRow {
  id: string;
  name: string;
  hostname: string;
  status: string;
  last_seen: number;
  created_at: number;
}

export interface MessageRow {
  id: string;
  type: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  audio_url: string | null;
  audio_autoplay: number;
  target_devices: string;
  status: string;
  sender_id: string | null;
  created_at: number;
}

// Database row type for message deliveries
export interface MessageDeliveryRow {
  id: number;
  message_id: string;
  device_id: string;
  status: string;
  delivered_at: number | null;
  failed_at: number | null;
  failure_reason: string | null;
}

// Socket event payload for delivery acknowledgment
export interface DeliveryAckPayload {
  messageId: string;
  deviceId: string;
  timestamp: number;
}

// Socket event payload for delivery status update
export interface DeliveryStatusUpdate {
  messageId: string;
  deviceId: string;
  status: DeviceDeliveryStatus;
  timestamp: number;
  overallStatus: MessageStatus;
}

// Scheduled message (from Supabase)
export interface ScheduledMessage {
  id: string;
  date: string;  // ISO date string (YYYY-MM-DD)
  recurring: boolean;
  type: MessageType;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  videoAutoplay?: boolean;
  audioAutoplay?: boolean;
  targetDevices?: string[];  // null = all devices
  createdAt: Date;
  updatedAt: Date;
  lastShownYear?: number;
}

// Form data for creating/editing scheduled messages
export interface ScheduledMessageFormData {
  date: string;
  recurring: boolean;
  type: MessageType;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  videoAutoplay?: boolean;
  audioAutoplay?: boolean;
  targetDevices?: string[];
}
