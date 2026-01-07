/**
 * CreaBomber API - Single Message
 * GET /api/messages/[id] - Returns a single message with full details
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMessage, getDevice } from '@/lib/db';
import { apiError, NotFoundError } from '@/lib/errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const message = getMessage(id);

    if (!message) {
      return apiError(new NotFoundError('Message', id), `GET /api/messages/${id}`);
    }

    // Enrich with device details
    const targetDevicesDetails = message.targetDevices.map((deviceId) => {
      const device = getDevice(deviceId);
      return device
        ? {
            id: device.id,
            name: device.name,
            hostname: device.hostname,
            status: device.status,
          }
        : {
            id: deviceId,
            name: 'Unknown Device',
            hostname: 'unknown',
            status: 'offline' as const,
          };
    });

    return NextResponse.json({
      message: {
        ...message,
        targetDevicesDetails,
      },
    });
  } catch (error) {
    return apiError(error, 'GET /api/messages/[id]');
  }
}
