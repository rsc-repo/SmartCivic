'use client';

import { useState } from 'react';
import {
  AuthUser,
  IssueHistoryEntry,
  IssueSummary,
  assignOfficer,
  getIssueHistory,
  updateIssueStatus,
} from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';

const PRE_ASSIGNMENT_STATUSES = new Set([
  'SUBMITTED',
  'VALIDATING',
  'VALID',
  'TRIAGED',
]);

interface IssueRowProps {
  issue: IssueSummary;
  currentUser: AuthUser;
  officers: AuthUser[];
  onChanged: () => void;
}

export default function IssueRow({
  issue,
  currentUser,
  officers,
  onChanged,
}: IssueRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState<IssueHistoryEntry[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedOfficerId, setSelectedOfficerId] = useState<string>('');
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveComments, setResolveComments] = useState('');
  const [resolveFiles, setResolveFiles] = useState<File[]>([]);

  const isAdmin =
    currentUser.role === 'DEPT_ADMIN' || currentUser.role === 'SYSTEM_ADMIN';
  const isAssignedToMe = issue.assignedOfficer?.id === currentUser.id;
  const canAct = isAdmin || isAssignedToMe;

  const toggleExpanded = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !history) {
      try {
        setHistory(await getIssueHistory(issue.id));
      } catch {
        setHistory([]);
      }
    }
  };

  const runAction = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleAssign = () => {
    if (!selectedOfficerId) return;
    runAction(() => assignOfficer(issue.id, Number(selectedOfficerId)));
  };

  const handleStartProgress = () =>
    runAction(() => updateIssueStatus(issue.id, 'IN_PROGRESS'));

  const handleResolveSubmit = () =>
    runAction(async () => {
      await updateIssueStatus(
        issue.id,
        'RESOLVED',
        resolveComments || undefined,
        resolveFiles,
      );
      setResolveOpen(false);
      setResolveComments('');
      setResolveFiles([]);
    });

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <button
            onClick={toggleExpanded}
            className="text-left font-medium text-black dark:text-zinc-50 hover:underline"
          >
            {issue.title}
          </button>
          <p className="text-xs text-zinc-500 mt-0.5">
            {issue.ticketId} · {issue.category}
            {issue.department ? ` · ${issue.department.name}` : ''}
          </p>
          {issue.assignedOfficer && (
            <p className="text-xs text-zinc-500">
              Assigned to {issue.assignedOfficer.fullName}
            </p>
          )}
        </div>
        <StatusBadge status={issue.status} />
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isAdmin && PRE_ASSIGNMENT_STATUSES.has(issue.status) && (
          <>
            <select
              value={selectedOfficerId}
              onChange={(e) => setSelectedOfficerId(e.target.value)}
              className="rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1 text-xs"
            >
              <option value="">Select officer…</option>
              {officers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.fullName}
                </option>
              ))}
            </select>
            <button
              disabled={!selectedOfficerId || busy}
              onClick={handleAssign}
              className="rounded bg-black text-white dark:bg-white dark:text-black px-2.5 py-1 text-xs font-medium disabled:opacity-50"
            >
              Assign
            </button>
          </>
        )}

        {issue.status === 'ASSIGNED' && canAct && (
          <button
            disabled={busy}
            onClick={handleStartProgress}
            className="rounded bg-black text-white dark:bg-white dark:text-black px-2.5 py-1 text-xs font-medium disabled:opacity-50"
          >
            Start progress
          </button>
        )}

        {issue.status === 'IN_PROGRESS' && canAct && !resolveOpen && (
          <button
            disabled={busy}
            onClick={() => setResolveOpen(true)}
            className="rounded bg-black text-white dark:bg-white dark:text-black px-2.5 py-1 text-xs font-medium disabled:opacity-50"
          >
            Mark resolved…
          </button>
        )}

        {issue.status === 'VERIFICATION_PENDING' && (
          <span className="text-xs text-zinc-500">
            Awaiting citizen confirmation (Phase 7)
          </span>
        )}
      </div>

      {resolveOpen && (
        <div className="mt-3 rounded border border-zinc-200 dark:border-zinc-800 p-3 space-y-2">
          <label className="block text-xs text-zinc-500">
            Resolution notes
          </label>
          <textarea
            value={resolveComments}
            onChange={(e) => setResolveComments(e.target.value)}
            className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1 text-sm"
            rows={2}
          />
          <label className="block text-xs text-zinc-500">
            Repair evidence photos (optional)
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            multiple
            onChange={(e) =>
              setResolveFiles(e.target.files ? Array.from(e.target.files) : [])
            }
            className="text-xs"
          />
          <div className="flex gap-2">
            <button
              disabled={busy}
              onClick={handleResolveSubmit}
              className="rounded bg-black text-white dark:bg-white dark:text-black px-2.5 py-1 text-xs font-medium disabled:opacity-50"
            >
              Submit resolution
            </button>
            <button
              disabled={busy}
              onClick={() => setResolveOpen(false)}
              className="rounded border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {expanded && (
        <div className="mt-3 border-t border-zinc-200 dark:border-zinc-800 pt-3">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">
            Status history
          </p>
          {history === null ? (
            <p className="text-xs text-zinc-400">Loading…</p>
          ) : history.length === 0 ? (
            <p className="text-xs text-zinc-400">No history yet.</p>
          ) : (
            <ul className="space-y-1">
              {history.map((h) => (
                <li key={h.id} className="text-xs text-zinc-500">
                  <span className="text-zinc-400">
                    {new Date(h.createdAt).toLocaleString()}
                  </span>{' '}
                  — {h.previousStatus ?? 'new'} → <strong>{h.newStatus}</strong>
                  {h.comments ? ` — ${h.comments}` : ''}
                  {h.changedBy ? ` (${h.changedBy.fullName})` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
