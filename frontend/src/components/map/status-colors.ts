import { IssueStatus } from '@/lib/api';

// Grouped by where the issue sits in its lifecycle, not the literal enum
// value — keeps the legend to a manageable handful of colors instead of
// eleven near-identical statuses.
export const STATUS_COLORS: Record<IssueStatus, string> = {
  SUBMITTED: '#f59e0b', // amber — awaiting triage
  VALIDATING: '#f59e0b',
  VALID: '#f59e0b',
  TRIAGED: '#3b82f6', // blue — queued for work
  ASSIGNED: '#3b82f6',
  IN_PROGRESS: '#8b5cf6', // violet — actively being worked
  RESOLVED: '#10b981', // green — fixed, pending citizen confirmation
  VERIFICATION_PENDING: '#10b981',
  CLOSED: '#6b7280', // gray — done
  INVALID: '#6b7280',
  REOPENED: '#ef4444', // red — needs attention again
};

export const STATUS_LABELS: Record<IssueStatus, string> = {
  SUBMITTED: 'Submitted',
  VALIDATING: 'Validating',
  VALID: 'Valid',
  INVALID: 'Invalid',
  TRIAGED: 'Triaged',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  VERIFICATION_PENDING: 'Verification Pending',
  CLOSED: 'Closed',
  REOPENED: 'Reopened',
};

export const LEGEND_GROUPS: Array<{ label: string; color: string }> = [
  { label: 'Awaiting triage', color: STATUS_COLORS.SUBMITTED },
  { label: 'Queued / assigned', color: STATUS_COLORS.TRIAGED },
  { label: 'In progress', color: STATUS_COLORS.IN_PROGRESS },
  { label: 'Resolved', color: STATUS_COLORS.RESOLVED },
  { label: 'Closed / invalid', color: STATUS_COLORS.CLOSED },
  { label: 'Reopened', color: STATUS_COLORS.REOPENED },
];
