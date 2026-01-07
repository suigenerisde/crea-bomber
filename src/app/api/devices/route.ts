/**
 * CreaBomber API - Devices Collection
 * GET /api/devices - Returns all devices from database
 * POST /api/devices - Creates a new device (manual registration)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDevices, createDevice } from '@/lib/db';
import {
  apiError,
  DatabaseError,
  validateRequired,
  validateString,
  combineValidation,
  validationResultToError,
  safeJsonParse,
} from '@/lib/errors';

const MAX_NAME_LENGTH = 100;
const MAX_HOSTNAME_LENGTH = 255;

export async function GET() {
  try {
    const devices = getDevices();
    return NextResponse.json({ devices });
  } catch (error) {
    return apiError(
      new DatabaseError('Failed to fetch devices', error),
      'GET /api/devices'
    );
  }
}

interface CreateDeviceBody {
  name: string;
  hostname: string;
  id?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse JSON body safely
    const { data: body, error: parseError } =
      await safeJsonParse<CreateDeviceBody>(request);

    if (parseError || !body) {
      return apiError(
        parseError ?? new Error('Request body is required'),
        'POST /api/devices'
      );
    }

    const { name, hostname, id } = body;

    // Validate required fields
    const validation = combineValidation(
      validateRequired(name, 'name'),
      validateRequired(hostname, 'hostname'),
      validateString(name, 'name', { minLength: 1, maxLength: MAX_NAME_LENGTH }),
      validateString(hostname, 'hostname', { minLength: 1, maxLength: MAX_HOSTNAME_LENGTH })
    );

    // Optional ID validation if provided
    if (id !== undefined) {
      const idValidation = validateString(id, 'id', { minLength: 1, maxLength: 36 });
      if (idValidation) {
        validation.errors.push(idValidation);
      }
    }

    const validationError = validationResultToError(validation);
    if (validationError) {
      return apiError(validationError, 'POST /api/devices');
    }

    try {
      const device = createDevice(name, hostname, id);
      return NextResponse.json({ device }, { status: 201 });
    } catch (dbError) {
      throw new DatabaseError('Failed to create device in database', dbError);
    }
  } catch (error) {
    return apiError(error, 'POST /api/devices');
  }
}
