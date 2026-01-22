/**
 * CreaBomber - useAuth Hook
 * Client-side authentication and role management
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { type UserRole, DEFAULT_ROLE, canSend, canManage } from '@/lib/auth';

export interface AuthState {
  user: {
    id: string;
    email: string;
    role: UserRole;
  } | null;
  loading: boolean;
  canSend: boolean;
  canManage: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    canSend: false,
    canManage: false,
  });

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const role = (user.user_metadata?.role as UserRole) || DEFAULT_ROLE;
        setState({
          user: {
            id: user.id,
            email: user.email ?? '',
            role,
          },
          loading: false,
          canSend: canSend(role),
          canManage: canManage(role),
        });
      } else {
        setState({
          user: null,
          loading: false,
          canSend: false,
          canManage: false,
        });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const role = (session.user.user_metadata?.role as UserRole) || DEFAULT_ROLE;
          setState({
            user: {
              id: session.user.id,
              email: session.user.email ?? '',
              role,
            },
            loading: false,
            canSend: canSend(role),
            canManage: canManage(role),
          });
        } else {
          setState({
            user: null,
            loading: false,
            canSend: false,
            canManage: false,
          });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
