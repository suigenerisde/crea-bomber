/**
 * CreaBomber - AccessDenied Component
 * Shown when user lacks permission for a page or action
 */

'use client';

import { ShieldOff, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from './Button';

interface AccessDeniedProps {
  message?: string;
  requiredRole?: string;
}

export function AccessDenied({
  message = 'Du hast keine Berechtigung fuer diese Seite.',
  requiredRole,
}: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
      <div className="bg-slate-800/50 rounded-full p-6 mb-6">
        <ShieldOff className="w-16 h-16 text-red-400" />
      </div>

      <h2 className="text-2xl font-semibold text-white mb-2">
        Zugriff verweigert
      </h2>

      <p className="text-slate-400 mb-2 max-w-md">
        {message}
      </p>

      {requiredRole && (
        <p className="text-sm text-slate-500 mb-6">
          Erforderliche Rolle: <span className="text-slate-300 font-medium">{requiredRole}</span>
        </p>
      )}

      <Link href="/">
        <Button variant="secondary">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurueck zum Dashboard
        </Button>
      </Link>
    </div>
  );
}
