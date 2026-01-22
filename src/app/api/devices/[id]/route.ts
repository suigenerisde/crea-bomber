/**
 * CreaBomber API - Single Device
 * GET /api/devices/[id] - Returns a single device
 * PATCH /api/devices/[id] - Updates a device
 * DELETE /api/devices/[id] - Removes a device
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDevice, db } from '@/lib/db';
import type { DeviceStatus } from '@/types';
import {
  apiError,
  NotFoundError,
  ValidationError,
  DatabaseError,
  validateString,
  validateEnum,
  safeJsonParse,
} from '@/lib/errors';
import { getCurrentUser } from '@/lib/auth/getUser';
import { canManage } from '@/lib/auth';

const MAX_NAME_LENGTH = 100;
const MAX_HOSTNAME_LENGTH = 255;
const VALID_STATUSES: DeviceStatus[] = ['online', 'offline'];

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const device = getDevice(id);

    if (!device) {
      return apiError(new NotFoundError('Device', id), `GET /api/devices/${id}`);
    }

    return NextResponse.json({ device });
  } catch (error) {
    return apiError(error, 'GET /api/devices/[id]');
  }
}

interface UpdateDeviceBody {
  name?: string;
  hostname?: string;
  status?: string;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Parse JSON body safely
    const { data: body, error: parseError } =
      await safeJsonParse<UpdateDeviceBody>(request);

    if (parseError) {
      return apiError(parseError, `PATCH /api/devices/${id}`);
    }

    // Empty body is a valid request (no changes)
    if (!body || Object.keys(body).length === 0) {
      return apiError(
        new ValidationError('No fields provided to update'),
        `PATCH /api/devices/${id}`
      );
    }

    const { name, hostname, status } = body;

    // Check if device exists
    const existingDevice = getDevice(id);
    if (!existingDevice) {
      return apiError(new NotFoundError('Device', id), `PATCH /api/devices/${id}`);
    }

    // Validate provided fields
    const errors: string[] = [];

    if (name !== undefined) {
      const nameError = validateString(name, 'name', {
        minLength: 1,
        maxLength: MAX_NAME_LENGTH,
      });
      if (nameError) errors.push(nameError.message);
    }

    if (hostname !== undefined) {
      const hostnameError = validateString(hostname, 'hostname', {
        minLength: 1,
        maxLength: MAX_HOSTNAME_LENGTH,
      });
      if (hostnameError) errors.push(hostnameError.message);
    }

    if (status !== undefined) {
      const statusError = validateEnum(status, 'status', VALID_STATUSES);
      if (statusError) errors.push(statusError.message);
    }

    if (errors.length > 0) {
      return apiError(
        new ValidationError(errors.join('; ')),
        `PATCH /api/devices/${id}`
      );
    }

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (hostname !== undefined) {
      updates.push('hostname = ?');
      values.push(hostname);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
      if (status === 'online') {
        updates.push('last_seen = ?');
        values.push(Date.now());
      }
    }

    try {
      values.push(id);
      const sql = `UPDATE devices SET ${updates.join(', ')} WHERE id = ?`;
      const stmt = db.prepare(sql);
      stmt.run(...values);
    } catch (dbError) {
      throw new DatabaseError('Failed to update device in database', dbError);
    }

    const updatedDevice = getDevice(id);
    return NextResponse.json({ device: updatedDevice });
  } catch (error) {
    return apiError(error, 'PATCH /api/devices/[id]');
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication and permission
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!canManage(user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin role required' }, { status: 403 });
    }

    const { id } = await params;
    const existingDevice = getDevice(id);

    if (!existingDevice) {
      return apiError(new NotFoundError('Device', id), `DELETE /api/devices/${id}`);
    }

    try {
      const stmt = db.prepare('DELETE FROM devices WHERE id = ?');
      stmt.run(id);
    } catch (dbError) {
      throw new DatabaseError('Failed to delete device from database', dbError);
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    return apiError(error, 'DELETE /api/devices/[id]');
  }
}
