/**
 * CreaBomber API - Single Device
 * GET /api/devices/[id] - Returns a single device
 * PATCH /api/devices/[id] - Updates a device
 * DELETE /api/devices/[id] - Removes a device
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDevice, updateDeviceStatus, db } from '@/lib/db';
import type { DeviceStatus } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const device = getDevice(id);

    if (!device) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ device });
  } catch (error) {
    console.error('[API] Failed to fetch device:', error);
    return NextResponse.json(
      { error: 'Failed to fetch device' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, hostname, status } = body;

    const existingDevice = getDevice(id);
    if (!existingDevice) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
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
      const validStatuses: DeviceStatus[] = ['online', 'offline'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be "online" or "offline"' },
          { status: 400 }
        );
      }
      updates.push('status = ?');
      values.push(status);
      if (status === 'online') {
        updates.push('last_seen = ?');
        values.push(Date.now());
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    values.push(id);
    const sql = `UPDATE devices SET ${updates.join(', ')} WHERE id = ?`;
    const stmt = db.prepare(sql);
    stmt.run(...values);

    const updatedDevice = getDevice(id);
    return NextResponse.json({ device: updatedDevice });
  } catch (error) {
    console.error('[API] Failed to update device:', error);
    return NextResponse.json(
      { error: 'Failed to update device' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const existingDevice = getDevice(id);

    if (!existingDevice) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    const stmt = db.prepare('DELETE FROM devices WHERE id = ?');
    stmt.run(id);

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('[API] Failed to delete device:', error);
    return NextResponse.json(
      { error: 'Failed to delete device' },
      { status: 500 }
    );
  }
}
