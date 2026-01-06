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

// Message delivery status
export type MessageStatus = 'pending' | 'sent' | 'delivered';

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
  created_at: number;
}
