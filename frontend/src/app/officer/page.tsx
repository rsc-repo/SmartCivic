'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  AuthUser,
  Department,
  IssueStatus,
  IssueSummary,
  getDepartments,
  getIssues,
  getOfficers,
} from '@/lib/api';
import IssueRow from '@/components/officer/IssueRow';

const STATUS_OPTIONS: IssueStatus[] = [
  'SUBMITTED',
  'VALIDATING',
  'VALID',
  'TRIAGED',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'VERIFICATION_PENDING',
  'CLOSED',
  'REOPENED',
  'INVALID',
];

export default function OfficerPage() {
  const { user, isLoading: authLoading } = useAuth();

  const [issues, setIssues] = useState<IssueSummary[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [officers, setOfficers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState('');
  const [onlyMine, setOnlyMine] = useState(true);

  const isAdmin =
    user?.role === 'DEPT_ADMIN' || user?.role === 'SYSTEM_ADMIN';
  const canView = user && (isAdmin || user.role === 'OFFICER');

  const load = useCallback(async () => {
    if (!user || !canView) return;
    setLoading(true);
    setError(null);
    try {
      const filter: Record<string, string | number> = {};
      if (departmentId) filter.departmentId = Number(departmentId);
      if (status) filter.status = status;
      if (onlyMine && !isAdmin) filter.assignedOfficerId = user.id;

      const [issuesResult, deptResult] = await Promise.all([
        getIssues(filter),
        departments.length ? Promise.resolve(departments) : getDepartments(),
      ]);
      setIssues(issuesResult);
      if (!departments.length) setDepartments(deptResult);

      if (isAdmin && officers.length === 0) {
        setOfficers(await getOfficers());
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          'Could not load issues — is the backend running?',
      );
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, canView, departmentId, status, onlyMine, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  if (authLoading) {
    return <main className="p-8 text-sm text-zinc-500">Loading…</main>;
  }

  if (!user) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-semibold">Officer Dashboard</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Please{' '}
          <Link href="/login" className="underline">
            log in
          </Link>{' '}
          as an officer or admin to view this page.
        </p>
      </main>
    );
  }

  if (!canView) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-semibold">Officer Dashboard</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Your account ({user.role}) does not have access to the officer
          dashboard.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 sm:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        Officer Dashboard
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Logged in as {user.fullName} ({user.role})
      </p>

      <section className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">
            Department
          </label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5 text-sm"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5 text-sm"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {!isAdmin && (
          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={onlyMine}
              onChange={(e) => setOnlyMine(e.target.checked)}
            />
            Only my assigned issues
          </label>
        )}

        <button
          onClick={load}
          className="rounded border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm"
        >
          Refresh
        </button>
      </section>

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-zinc-400">Loading issues…</p>
        ) : issues.length === 0 ? (
          <p className="text-sm text-zinc-400">
            No issues match these filters.
          </p>
        ) : (
          issues.map((issue) => (
            <IssueRow
              key={issue.id}
              issue={issue}
              currentUser={user}
              officers={officers}
              onChanged={load}
            />
          ))
        )}
      </div>
    </main>
  );
}
