/**
 * CreaBomber API - Admin Users
 * GET /api/admin/users - Returns all users with their roles
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth/getUser';
import { canManage } from '@/lib/auth';

// Create admin client with service role key for user management
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin credentials not configured');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function GET() {
  try {
    // Check authentication and admin permission
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!canManage(user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin role required' }, { status: 403 });
    }

    const supabaseAdmin = createAdminClient();

    // Get all users from Supabase Auth
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error('[Admin API] Error listing users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Map users to safe format (no sensitive data)
    const safeUsers = users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.user_metadata?.role || 'viewer',
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at,
    }));

    return NextResponse.json({ users: safeUsers });
  } catch (error) {
    console.error('[Admin API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
