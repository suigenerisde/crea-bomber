/**
 * Health Check Endpoint
 * Used by load balancers, Coolify, and monitoring systems to verify the server is running
 */

import { NextResponse } from 'next/server';
import { getDeviceCount, getOnlineDevices } from '@/lib/db';

export async function GET() {
  try {
    // Basic health info
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
    };

    // Try to get database stats (optional - don't fail health check if DB is slow)
    try {
      const deviceCount = getDeviceCount();
      const onlineDevices = getOnlineDevices();

      return NextResponse.json({
        ...health,
        database: {
          status: 'connected',
          devices: {
            total: deviceCount,
            online: onlineDevices.length,
          },
        },
      });
    } catch {
      // Database not available, but server is still running
      return NextResponse.json({
        ...health,
        database: {
          status: 'unavailable',
        },
      });
    }
  } catch (error) {
    // Server error
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

// Also support HEAD requests for simple health checks
export async function HEAD() {
  return new Response(null, { status: 200 });
}
