'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function NavBar() {
  const { user, logout, isLoading } = useAuth();

  const canSeeOfficerDashboard =
    user &&
    (user.role === 'OFFICER' ||
      user.role === 'DEPT_ADMIN' ||
      user.role === 'SYSTEM_ADMIN');

  return (
    <nav className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-3 flex items-center justify-between text-sm">
      <div className="flex items-center gap-4">
        <Link href="/" className="font-semibold text-black dark:text-zinc-50">
          SmartCivic
        </Link>
        <Link href="/map" className="text-zinc-500 hover:text-black dark:hover:text-white">
          Map
        </Link>
        <Link href="/report" className="text-zinc-500 hover:text-black dark:hover:text-white">
          Report an issue
        </Link>
        {canSeeOfficerDashboard && (
          <Link href="/officer" className="text-zinc-500 hover:text-black dark:hover:text-white">
            Officer dashboard
          </Link>
        )}
      </div>

      <div>
        {isLoading ? null : user ? (
          <div className="flex items-center gap-3">
            <span className="text-zinc-500">
              {user.fullName} <span className="text-zinc-400">({user.role})</span>
            </span>
            <button
              onClick={logout}
              className="rounded border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 text-xs"
            >
              Log out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 text-xs font-medium"
          >
            Log in
          </Link>
        )}
      </div>
    </nav>
  );
}
