/**
 * CreaBomber Mock Devices
 * Seed data for development and testing
 */

import { createDevice, getDeviceCount } from './db';

// Mock device definitions
const MOCK_DEVICES = [
  {
    id: 'device-macbook-pro-thilo',
    name: 'MacBook Pro - Thilo',
    hostname: 'thilos-macbook-pro.local',
  },
  {
    id: 'device-mac-studio-office',
    name: 'Mac Studio - Office',
    hostname: 'mac-studio-office.local',
  },
  {
    id: 'device-macbook-air-mobile',
    name: 'MacBook Air - Mobile',
    hostname: 'macbook-air-mobile.local',
  },
] as const;

/**
 * Seeds the database with mock devices if the devices table is empty
 * @returns The number of devices seeded (0 if table was not empty)
 */
export function seedMockDevices(): number {
  const existingCount = getDeviceCount();

  if (existingCount > 0) {
    console.log(
      `[MockDevices] Skipping seed - ${existingCount} devices already exist`
    );
    return 0;
  }

  console.log('[MockDevices] Seeding mock devices...');

  for (const device of MOCK_DEVICES) {
    createDevice(device.name, device.hostname, device.id);
    console.log(`[MockDevices] Created: ${device.name}`);
  }

  console.log(`[MockDevices] Seeded ${MOCK_DEVICES.length} mock devices`);
  return MOCK_DEVICES.length;
}

export { MOCK_DEVICES };
