/**
 * CreaBomber - User Authentication Helpers
 * Server-side functions to get current user with role
 */

import { createClient } from '@/lib/supabase/server';
import { type UserRole, DEFAULT_ROLE } from './permissions';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * Get current authenticated user with role (Server-side)
 * Use in Server Components, Route Handlers, Server Actions
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? '',
    role: (user.user_metadata?.role as UserRole) || DEFAULT_ROLE,
  };
}

/**
 * Require authentication - throws if not logged in
 * Use for protected API routes
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

/**
 * Require specific role - throws if role insufficient
 * Use for role-protected API routes
 */
export async function requireRole(requiredRole: UserRole): Promise<AuthUser> {
  const user = await requireAuth();

  const roleHierarchy: Record<UserRole, number> = {
    admin: 3,
    sender: 2,
    viewer: 1,
  };

  if (roleHierarchy[user.role] < roleHierarchy[requiredRole]) {
    throw new Error('Forbidden');
  }

  return user;
}
