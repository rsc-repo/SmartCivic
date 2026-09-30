import { LEGEND_GROUPS } from './status-colors';

export default function MapLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-600 dark:text-zinc-400">
      {LEGEND_GROUPS.map((g) => (
        <div key={g.label} className="flex items-center gap-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full border border-white shadow-sm"
            style={{ background: g.color }}
          />
          {g.label}
        </div>
      ))}
    </div>
  );
}
