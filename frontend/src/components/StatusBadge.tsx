import { IssueStatus } from '@/lib/api';
import { STATUS_COLORS, STATUS_LABELS } from './map/status-colors';

export default function StatusBadge({ status }: { status: IssueStatus }) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-white text-xs whitespace-nowrap"
      style={{ background: STATUS_COLORS[status] }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
