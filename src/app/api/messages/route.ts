/**
 * CreaBomber API - Messages Collection
 * GET /api/messages - Returns paginated message history
 * POST /api/messages - Creates a new message and triggers WebSocket broadcast
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, getMessage, createMessageDeliveries, updateMessageStatus } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import type { Message, MessageRow, MessageType, MessageStatus, MessageDeliveryRow, MessageDelivery, DeviceDeliveryStatus } from '@/types';
import {
  apiError,
  ValidationError,
  DatabaseError,
  validateRequired,
  validateString,
  validateArray,
  validateEnum,
  validateUrl,
  combineValidation,
  validationResultToError,
  safeJsonParse,
} from '@/lib/errors';
import { getCurrentUser } from '@/lib/auth/getUser';
import { canSend, canManage } from '@/lib/auth';
import { getSocketServer } from '@/lib/socket-server';

// Valid message types
const VALID_MESSAGE_TYPES = ['TEXT', 'TEXT_IMAGE', 'VIDEO', 'AUDIO'] as const;
const MAX_CONTENT_LENGTH = 10000;
const MAX_URL_LENGTH = 2048;

// Helper: Convert MessageDeliveryRow to MessageDelivery
function rowToDelivery(row: MessageDeliveryRow): MessageDelivery {
  return {
    deviceId: row.device_id,
    status: row.status as DeviceDeliveryStatus,
    deliveredAt: row.delivered_at ? new Date(row.delivered_at) : undefined,
    failedAt: row.failed_at ? new Date(row.failed_at) : undefined,
    failureReason: row.failure_reason ?? undefined,
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
    senderId: row.sender_id ?? undefined,
    createdAt: new Date(row.created_at),
  };
}

// Validate query parameters
function validateQueryParams(searchParams: URLSearchParams): {
  limit: number;
  offset: number;
  type: string | null;
  search: string | null;
  error: ValidationError | null;
} {
  const limitStr = searchParams.get('limit') ?? '20';
  const offsetStr = searchParams.get('offset') ?? '0';
  const type = searchParams.get('type');
  const search = searchParams.get('search');

  const limit = parseInt(limitStr, 10);
  const offset = parseInt(offsetStr, 10);

  if (isNaN(limit) || limit < 1 || limit > 100) {
    return {
      limit: 20,
      offset: 0,
      type: null,
      search: null,
      error: new ValidationError('limit must be a number between 1 and 100'),
    };
  }

  if (isNaN(offset) || offset < 0) {
    return {
      limit: 20,
      offset: 0,
      type: null,
      search: null,
      error: new ValidationError('offset must be a non-negative number'),
    };
  }

  if (type && !VALID_MESSAGE_TYPES.includes(type as typeof VALID_MESSAGE_TYPES[number])) {
    return {
      limit,
      offset,
      type: null,
      search: null,
      error: new ValidationError(
        `type must be one of: ${VALID_MESSAGE_TYPES.join(', ')}`
      ),
    };
  }

  return { limit, offset, type, search, error: null };
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Viewers see no messages
    if (!canSend(user.role)) {
      return NextResponse.json({
        messages: [],
        pagination: {
          total: 0,
          limit: 20,
          offset: 0,
          hasMore: false,
        },
      });
    }

    const { searchParams } = new URL(request.url);
    const { limit, offset, type, search, error: queryError } =
      validateQueryParams(searchParams);

    if (queryError) {
      return apiError(queryError, 'GET /api/messages');
    }

    // Build query with optional filters
    let sql = 'SELECT * FROM messages';
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    // Admins see all messages, Senders see only their own
    if (!canManage(user.role)) {
      conditions.push('sender_id = ?');
      params.push(user.id);
    }

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

    // Fetch deliveries for all messages in batch
    if (messages.length > 0) {
      const messageIds = messages.map((m) => m.id);
      const placeholders = messageIds.map(() => '?').join(',');
      const deliveryStmt = db.prepare(
        `SELECT * FROM message_deliveries WHERE message_id IN (${placeholders})`
      );
      const deliveryRows = deliveryStmt.all(...messageIds) as MessageDeliveryRow[];

      // Group deliveries by message ID
      const deliveriesByMessage = new Map<string, MessageDelivery[]>();
      for (const row of deliveryRows) {
        const delivery = rowToDelivery(row);
        const existing = deliveriesByMessage.get(row.message_id) || [];
        existing.push(delivery);
        deliveriesByMessage.set(row.message_id, existing);
      }

      // Attach deliveries to messages
      for (const message of messages) {
        message.deliveries = deliveriesByMessage.get(message.id) || [];
      }
    }

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
    return apiError(error, 'GET /api/messages');
  }
}

// Request body interface
interface CreateMessageBody {
  type: string;
  content: string;
  targetDevices: string[];
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  audioAutoplay?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and permission
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!canSend(user.role)) {
      return NextResponse.json({ error: 'Forbidden - Sender or Admin role required' }, { status: 403 });
    }

    // Parse JSON body safely
    const { data: body, error: parseError } =
      await safeJsonParse<CreateMessageBody>(request);

    if (parseError || !body) {
      return apiError(parseError ?? new ValidationError('Request body is required'), 'POST /api/messages');
    }

    const { type, content, targetDevices, imageUrl, videoUrl, audioUrl, audioAutoplay } = body;

    // Comprehensive validation
    const validation = combineValidation(
      validateRequired(type, 'type'),
      validateRequired(content, 'content'),
      validateRequired(targetDevices, 'targetDevices'),
      validateEnum(type, 'type', [...VALID_MESSAGE_TYPES]),
      validateString(content, 'content', { minLength: 1, maxLength: MAX_CONTENT_LENGTH }),
      validateArray(targetDevices, 'targetDevices', { minLength: 1 })
    );

    // Type-specific validation
    if (type === 'TEXT_IMAGE') {
      const imageValidation = combineValidation(
        validateRequired(imageUrl, 'imageUrl'),
        validateUrl(imageUrl, 'imageUrl'),
        validateString(imageUrl ?? '', 'imageUrl', { maxLength: MAX_URL_LENGTH })
      );
      validation.errors.push(...imageValidation.errors);
    }

    if (type === 'VIDEO') {
      const videoValidation = combineValidation(
        validateRequired(videoUrl, 'videoUrl'),
        validateUrl(videoUrl, 'videoUrl'),
        validateString(videoUrl ?? '', 'videoUrl', { maxLength: MAX_URL_LENGTH })
      );
      validation.errors.push(...videoValidation.errors);
    }

    if (type === 'AUDIO') {
      const audioValidation = combineValidation(
        validateRequired(audioUrl, 'audioUrl'),
        validateUrl(audioUrl, 'audioUrl'),
        validateString(audioUrl ?? '', 'audioUrl', { maxLength: MAX_URL_LENGTH })
      );
      validation.errors.push(...audioValidation.errors);
    }

    // Return validation errors if any
    const validationError = validationResultToError(validation);
    if (validationError) {
      return apiError(validationError, 'POST /api/messages');
    }

    // Create message in database
    const id = uuidv4();
    const now = Date.now();

    try {
      const stmt = db.prepare(`
        INSERT INTO messages (id, type, content, image_url, video_url, audio_url, audio_autoplay, target_devices, status, sender_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
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
        user.id,
        now
      );
    } catch (dbError) {
      throw new DatabaseError('Failed to save message to database', dbError);
    }

    const message = getMessage(id);

    if (!message) {
      throw new DatabaseError('Message was created but could not be retrieved');
    }

    // Create delivery records for each target device
    createMessageDeliveries(id, targetDevices, 'sent');

    // Broadcast message to target devices via WebSocket
    const io = getSocketServer();
    if (io) {
      for (const deviceId of targetDevices) {
        io.to(`device:${deviceId}`).emit('message:receive', {
          id: message.id,
          type,
          content,
          targetDevices,
          imageUrl,
          videoUrl,
          audioUrl,
          audioAutoplay,
          timestamp: now,
        });
      }
      // Update message status to sent
      updateMessageStatus(id, 'sent');
      message.status = 'sent';
      console.log(`[API] Message ${id} broadcasted to ${targetDevices.length} devices`);
    } else {
      console.warn('[API] Socket server not available, message saved but not broadcasted');
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return apiError(error, 'POST /api/messages');
  }
}
