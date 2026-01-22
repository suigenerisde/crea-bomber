/**
 * CreaBomber API - Change User Role
 * PATCH /api/admin/users/[id]/role - Updates a user's role
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth/getUser';
import { canManage, type UserRole } from '@/lib/auth';

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

const VALID_ROLES: UserRole[] = ['admin', 'sender', 'viewer'];

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: targetUserId } = await params;

    // Check authentication and admin permission
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!canManage(user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin role required' }, { status: 403 });
    }

    // Prevent admin from changing their own role (safety measure)
    if (user.id === targetUserId) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { role } = body;

    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Update user metadata with new role
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      {
        user_metadata: { role },
      }
    );

    if (error) {
      console.error('[Admin API] Error updating user role:', error);
      return NextResponse.json(
        { error: 'Failed to update user role' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.user_metadata?.role || 'viewer',
      },
    });
  } catch (error) {
    console.error('[Admin API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
