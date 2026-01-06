/**
 * CreaBomber Database Layer
 * SQLite database using better-sqlite3 for devices and messages
 */

import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type {
  Device,
  DeviceRow,
  DeviceStatus,
  Message,
  MessageRow,
  MessageStatus,
  MessageType,
} from '@/types';

// Database path
const DB_PATH = path.join(process.cwd(), 'data', 'creabomber.db');

// Initialize database connection
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    hostname TEXT NOT NULL,
    status TEXT DEFAULT 'offline',
    last_seen INTEGER,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    video_url TEXT,
    audio_url TEXT,
    audio_autoplay INTEGER DEFAULT 0,
    target_devices TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at INTEGER NOT NULL
  );
`);

// Helper: Convert DeviceRow to Device
function rowToDevice(row: DeviceRow): Device {
  return {
    id: row.id,
    name: row.name,
    hostname: row.hostname,
    status: row.status as DeviceStatus,
    lastSeen: new Date(row.last_seen),
    createdAt: new Date(row.created_at),
  };
}

// Helper: Convert MessageRow to Message
function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    type: row.type as MessageType,
    content: row.content,
    imageUrl: row.image_url ?? undefined,
    videoUrl: row.video_url ?? undefined,
    audioUrl: row.audio_url ?? undefined,
    audioAutoplay: row.audio_autoplay === 1,
    targetDevices: JSON.parse(row.target_devices),
    status: row.status as MessageStatus,
    createdAt: new Date(row.created_at),
  };
}

// Device operations

export function getDevices(): Device[] {
  const stmt = db.prepare('SELECT * FROM devices ORDER BY created_at DESC');
  const rows = stmt.all() as DeviceRow[];
  return rows.map(rowToDevice);
}

export function getDevice(id: string): Device | null {
  const stmt = db.prepare('SELECT * FROM devices WHERE id = ?');
  const row = stmt.get(id) as DeviceRow | undefined;
  return row ? rowToDevice(row) : null;
}

export function createDevice(
  name: string,
  hostname: string,
  id?: string
): Device {
  const deviceId = id ?? uuidv4();
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO devices (id, name, hostname, status, last_seen, created_at)
    VALUES (?, ?, ?, 'online', ?, ?)
  `);

  stmt.run(deviceId, name, hostname, now, now);

  return {
    id: deviceId,
    name,
    hostname,
    status: 'online',
    lastSeen: new Date(now),
    createdAt: new Date(now),
  };
}

export function updateDeviceStatus(
  id: string,
  status: DeviceStatus,
  updateLastSeen = true
): boolean {
  const params: (string | number)[] = [status];
  let sql = 'UPDATE devices SET status = ?';

  if (updateLastSeen && status === 'online') {
    sql += ', last_seen = ?';
    params.push(Date.now());
  }

  sql += ' WHERE id = ?';
  params.push(id);

  const stmt = db.prepare(sql);
  const result = stmt.run(...params);
  return result.changes > 0;
}

export function upsertDevice(
  id: string,
  name: string,
  hostname: string
): Device {
  const existing = getDevice(id);

  if (existing) {
    // Update existing device
    const now = Date.now();
    const stmt = db.prepare(`
      UPDATE devices
      SET name = ?, hostname = ?, status = 'online', last_seen = ?
      WHERE id = ?
    `);
    stmt.run(name, hostname, now, id);

    return {
      ...existing,
      name,
      hostname,
      status: 'online',
      lastSeen: new Date(now),
    };
  }

  return createDevice(name, hostname, id);
}

// Message operations

export function getMessages(limit = 100): Message[] {
  const stmt = db.prepare(
    'SELECT * FROM messages ORDER BY created_at DESC LIMIT ?'
  );
  const rows = stmt.all(limit) as MessageRow[];
  return rows.map(rowToMessage);
}

export function getMessage(id: string): Message | null {
  const stmt = db.prepare('SELECT * FROM messages WHERE id = ?');
  const row = stmt.get(id) as MessageRow | undefined;
  return row ? rowToMessage(row) : null;
}

export function createMessage(
  type: MessageType,
  content: string,
  targetDevices: string[],
  options?: {
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
    audioAutoplay?: boolean;
  }
): Message {
  const id = uuidv4();
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO messages (id, type, content, image_url, video_url, audio_url, audio_autoplay, target_devices, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `);

  stmt.run(
    id,
    type,
    content,
    options?.imageUrl ?? null,
    options?.videoUrl ?? null,
    options?.audioUrl ?? null,
    options?.audioAutoplay ? 1 : 0,
    JSON.stringify(targetDevices),
    now
  );

  return {
    id,
    type,
    content,
    imageUrl: options?.imageUrl,
    videoUrl: options?.videoUrl,
    audioUrl: options?.audioUrl,
    audioAutoplay: options?.audioAutoplay,
    targetDevices,
    status: 'pending',
    createdAt: new Date(now),
  };
}

export function updateMessageStatus(
  id: string,
  status: MessageStatus
): boolean {
  const stmt = db.prepare('UPDATE messages SET status = ? WHERE id = ?');
  const result = stmt.run(status, id);
  return result.changes > 0;
}

// Utility functions

export function getDeviceCount(): number {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM devices');
  const result = stmt.get() as { count: number };
  return result.count;
}

export function getOnlineDevices(): Device[] {
  const stmt = db.prepare(
    "SELECT * FROM devices WHERE status = 'online' ORDER BY last_seen DESC"
  );
  const rows = stmt.all() as DeviceRow[];
  return rows.map(rowToDevice);
}

// Export database instance for advanced usage
export { db };
