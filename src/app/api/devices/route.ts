/**
 * CreaBomber API - Devices Collection
 * GET /api/devices - Returns all devices from database
 * POST /api/devices - Creates a new device (manual registration)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDevices, createDevice } from '@/lib/db';

export async function GET() {
  try {
    const devices = getDevices();
    return NextResponse.json({ devices });
  } catch (error) {
    console.error('[API] Failed to fetch devices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch devices' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, hostname, id } = body;

    if (!name || !hostname) {
      return NextResponse.json(
        { error: 'Name and hostname are required' },
        { status: 400 }
      );
    }

    const device = createDevice(name, hostname, id);
    return NextResponse.json({ device }, { status: 201 });
  } catch (error) {
    console.error('[API] Failed to create device:', error);
    return NextResponse.json(
      { error: 'Failed to create device' },
      { status: 500 }
    );
  }
}
