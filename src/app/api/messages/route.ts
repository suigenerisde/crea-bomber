/**
 * CreaBomber API - Messages Collection
 * GET /api/messages - Returns paginated message history
 * POST /api/messages - Creates a new message and triggers WebSocket broadcast
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, getMessage } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import type { Message, MessageRow, MessageType, MessageStatus } from '@/types';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    // Build query with optional filters
    let sql = 'SELECT * FROM messages';
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (type) {
      conditions.push('type = ?');
      params.push(type);
    }

    if (search) {
      conditions.push('content LIKE ?');
      params.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = db.prepare(sql);
    const rows = stmt.all(...params) as MessageRow[];
    const messages = rows.map(rowToMessage);

    // Get total count for pagination
    let countSql = 'SELECT COUNT(*) as count FROM messages';
    if (conditions.length > 0) {
      countSql += ' WHERE ' + conditions.join(' AND ');
    }
    const countStmt = db.prepare(countSql);
    const countResult = countStmt.get(...params.slice(0, -2)) as { count: number };

    return NextResponse.json({
      messages,
      pagination: {
        total: countResult.count,
        limit,
        offset,
        hasMore: offset + messages.length < countResult.count,
      },
    });
  } catch (error) {
    console.error('[API] Failed to fetch messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, content, targetDevices, imageUrl, videoUrl, audioUrl, audioAutoplay } = body;

    // Validate required fields
    if (!type || !content || !targetDevices || !Array.isArray(targetDevices)) {
      return NextResponse.json(
        { error: 'Type, content, and targetDevices array are required' },
        { status: 400 }
      );
    }

    // Validate message type
    const validTypes = ['TEXT', 'TEXT_IMAGE', 'VIDEO', 'AUDIO'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid message type' },
        { status: 400 }
      );
    }

    if (targetDevices.length === 0) {
      return NextResponse.json(
        { error: 'At least one target device is required' },
        { status: 400 }
      );
    }

    // Create message in database
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
      imageUrl ?? null,
      videoUrl ?? null,
      audioUrl ?? null,
      audioAutoplay ? 1 : 0,
      JSON.stringify(targetDevices),
      now
    );

    const message = getMessage(id);

    // Note: WebSocket broadcast is handled by the socket server when clients connect
    // The dashboard will use the socket to send messages to devices

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('[API] Failed to create message:', error);
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }
}
