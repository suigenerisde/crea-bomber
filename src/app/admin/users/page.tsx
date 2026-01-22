/**
 * CreaBomber - Admin User Management Page
 * Allows admins to view and change user roles
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { clsx } from 'clsx';
import { Users, Shield, RefreshCw } from 'lucide-react';
import { Button, PageTransition, Card, Badge } from '@/components/ui';
import { AccessDenied } from '@/components/ui/AccessDenied';
import { useAuth } from '@/hooks';
import { useToast } from '@/contexts';
import { type UserRole, ROLE_LABELS, getAssignableRoles } from '@/lib/auth';

interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  lastSignIn: string | null;
}

export default function AdminUsersPage() {
  const { user: currentUser, canManage, loading: authLoading } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users');
      }

      setUsers(data.users);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch users';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (canManage) {
      fetchUsers();
    }
  }, [canManage, fetchUsers]);

  // Handle role change
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingUserId(userId);

    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update role');
      }

      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );

      toast.success(`Rolle erfolgreich geaendert zu ${ROLE_LABELS[newRole]}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update role';
      toast.error(message);
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Permission check
  if (!authLoading && !canManage) {
    return (
      <PageTransition>
        <AccessDenied
          message="Du hast keine Berechtigung fuer die User-Verwaltung."
          requiredRole="Admin"
        />
      </PageTransition>
    );
  }

  // Role badge styling
  const getRoleBadgeVariant = (role: UserRole): 'success' | 'info' | 'neutral' => {
    switch (role) {
      case 'admin':
        return 'success';
      case 'sender':
        return 'info';
      default:
        return 'neutral';
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">User-Verwaltung</h1>
              <p className="text-slate-400 text-sm">
                Verwalte Benutzerrollen und Berechtigungen
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchUsers}
            loading={loading}
            iconLeft={<RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />}
          >
            Aktualisieren
          </Button>
        </div>

        {/* Role Legend */}
        <Card>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="success" size="sm">Admin</Badge>
              <span className="text-slate-400">Voller Zugriff + User-Verwaltung</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="info" size="sm">Sender</Badge>
              <span className="text-slate-400">Kann Nachrichten senden</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="neutral" size="sm">Viewer</Badge>
              <span className="text-slate-400">Nur Lesen</span>
            </div>
          </div>
        </Card>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Users Table */}
        <Card>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-700 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-slate-700 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-slate-700 rounded w-1/4" />
                  </div>
                  <div className="h-8 bg-slate-700 rounded w-24" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400">Keine Benutzer gefunden</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {users.map((adminUser) => {
                const isCurrentUser = adminUser.id === currentUser?.id;
                const isUpdating = updatingUserId === adminUser.id;

                return (
                  <div
                    key={adminUser.id}
                    className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                        <span className="text-lg">
                          {adminUser.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium flex items-center gap-2">
                          {adminUser.email}
                          {isCurrentUser && (
                            <span className="text-xs text-slate-500">(Du)</span>
                          )}
                        </p>
                        <p className="text-slate-500 text-xs">
                          Erstellt: {format(new Date(adminUser.createdAt), 'PPp', { locale: de })}
                          {adminUser.lastSignIn && (
                            <> • Letzter Login: {format(new Date(adminUser.lastSignIn), 'PPp', { locale: de })}</>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isCurrentUser ? (
                        <Badge variant={getRoleBadgeVariant(adminUser.role)}>
                          {ROLE_LABELS[adminUser.role]}
                        </Badge>
                      ) : (
                        <select
                          value={adminUser.role}
                          onChange={(e) => handleRoleChange(adminUser.id, e.target.value as UserRole)}
                          disabled={isUpdating}
                          className={clsx(
                            'bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm',
                            'text-white focus:outline-none focus:ring-2 focus:ring-blue-500',
                            isUpdating && 'opacity-50 cursor-wait'
                          )}
                        >
                          {getAssignableRoles().map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Info */}
        <div className="flex items-start gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <Shield className="w-5 h-5 text-slate-400 mt-0.5" />
          <div className="text-sm text-slate-400">
            <p className="font-medium text-slate-300 mb-1">Hinweis zur Sicherheit</p>
            <p>
              Du kannst deine eigene Rolle nicht aendern. Rollenänderungen werden sofort wirksam.
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
