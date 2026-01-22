/**
 * CreaBomber - Role-based Permissions
 * Defines user roles and their permissions
 */

export type UserRole = 'admin' | 'sender' | 'viewer';

export type Permission = 'view' | 'send' | 'manage_devices' | 'manage_scheduled' | 'manage_users';

export const DEFAULT_ROLE: UserRole = 'viewer';

/**
 * Permission matrix for each role
 */
export const PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  admin: ['view', 'send', 'manage_devices', 'manage_scheduled', 'manage_users'],
  sender: ['view', 'send'],
  viewer: ['view'],
} as const;

/**
 * Role hierarchy for display and comparison
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  sender: 2,
  viewer: 1,
};

/**
 * Role display names (German)
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  sender: 'Sender',
  viewer: 'Viewer',
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if user can send messages (admin or sender)
 */
export function canSend(role: UserRole): boolean {
  return role === 'admin' || role === 'sender';
}

/**
 * Check if user can manage resources (admin only)
 */
export function canManage(role: UserRole): boolean {
  return role === 'admin';
}

/**
 * Check if user can manage other users (admin only)
 */
export function canManageUsers(role: UserRole): boolean {
  return role === 'admin';
}

/**
 * Compare two roles - returns positive if role1 > role2
 */
export function compareRoles(role1: UserRole, role2: UserRole): number {
  return ROLE_HIERARCHY[role1] - ROLE_HIERARCHY[role2];
}

/**
 * Get all available roles for assignment (used in admin UI)
 */
export function getAssignableRoles(): UserRole[] {
  return ['admin', 'sender', 'viewer'];
}
