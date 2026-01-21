/**
 * Family Devices Configuration
 * Pre-configured device IDs for the Pfeil family
 * Each device gets a unique, deterministic ID that persists across rebuilds
 */

export interface FamilyDevice {
  id: string;
  name: string;
  hostname: string;
}

/**
 * List of pre-configured family devices
 * These will be auto-seeded when the server starts
 */
export const FAMILY_DEVICES: FamilyDevice[] = [
  {
    id: 'family-elly-buero',
    name: 'Elly-Buero',
    hostname: 'elly-buero.local',
  },
  {
    id: 'family-elly-notebook',
    name: 'Elly-Notebook',
    hostname: 'elly-notebook.local',
  },
  {
    id: 'family-gioia',
    name: 'Gioia',
    hostname: 'gioia.local',
  },
  {
    id: 'family-leo',
    name: 'Leo',
    hostname: 'leo.local',
  },
  {
    id: 'family-thilo',
    name: 'Thilo',
    hostname: 'thilo.local',
  },
];

/**
 * Get a family device by ID
 */
export function getFamilyDevice(id: string): FamilyDevice | undefined {
  return FAMILY_DEVICES.find((device) => device.id === id);
}

/**
 * Check if a device ID is a family device
 */
export function isFamilyDevice(id: string): boolean {
  return FAMILY_DEVICES.some((device) => device.id === id);
}

/**
 * Get all family device IDs
 */
export function getFamilyDeviceIds(): string[] {
  return FAMILY_DEVICES.map((device) => device.id);
}
