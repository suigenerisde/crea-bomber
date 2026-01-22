/**
 * CreaBomber - Auth Module
 * Re-exports permission functions (client-safe)
 *
 * NOTE: Server-only functions (getCurrentUser, requireAuth, requireRole)
 * must be imported directly from '@/lib/auth/getUser'
 */

export * from './permissions';
// DO NOT export from './getUser' here - it uses 'next/headers' which is server-only
