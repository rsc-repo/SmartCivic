import { randomBytes } from 'crypto';

/**
 * Generates a human-readable, sortable ticket id, e.g. "SC-20260926-A1B2C3".
 * Uniqueness is enforced at the call site by retrying on a rare collision
 * against the DB unique constraint (see IssuesService.create).
 */
export function generateTicketId(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const suffix = randomBytes(3).toString('hex').toUpperCase(); // 6 hex chars
  return `SC-${y}${m}${d}-${suffix}`;
}
