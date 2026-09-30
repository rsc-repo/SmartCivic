'use client';

import { useEffect, useState } from 'react';
import { getHealth, getDepartments, Department } from '@/lib/api';

type HealthState =
  | { state: 'loading' }
  | { state: 'ok'; database: string }
  | { state: 'error'; message: string };

export default function Home() {
  const [health, setHealth] = useState<HealthState>({ state: 'loading' });
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    getHealth()
      .then((data) => setHealth({ state: 'ok', database: data.database }))
      .catch((err) =>
        setHealth({ state: 'error', message: String(err?.message ?? err) }),
      );

    getDepartments()
      .then(setDepartments)
      .catch(() => setDepartments([]));
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-black px-6 py-16 sm:px-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          SmartCivic
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Phase 1 status: environment setup &amp; database initialization.
        </p>

        <section className="mt-8 rounded-lg border border-zinc-200 dark:border-zinc-800 p-5">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Backend connectivity
          </h2>
          <div className="mt-2">
            {health.state === 'loading' && (
              <p className="text-zinc-500">Checking backend…</p>
            )}
            {health.state === 'ok' && (
              <p className="text-green-600 dark:text-green-400">
                ✓ API reachable — database: {health.database}
              </p>
            )}
            {health.state === 'error' && (
              <p className="text-red-600 dark:text-red-400">
                ✗ Could not reach backend at{' '}
                <code>NEXT_PUBLIC_API_URL</code> ({health.message}). Make
                sure <code>npm run dev</code> is running in{' '}
                <code>backend/</code>.
              </p>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-zinc-200 dark:border-zinc-800 p-5">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Seeded departments
          </h2>
          {departments.length === 0 ? (
            <p className="mt-2 text-zinc-500">
              No departments loaded yet — run{' '}
              <code>npm run seed</code> in <code>backend/</code>.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
              {departments.map((d) => (
                <li key={d.id} className="py-2 flex justify-between text-sm">
                  <span>{d.name}</span>
                  <span className="text-zinc-500">
                    {d.code} · SLA {d.slaHoursDefault}h
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
