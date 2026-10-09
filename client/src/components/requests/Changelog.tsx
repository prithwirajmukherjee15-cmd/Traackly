import { ArrowRight, CircleDot, Pencil } from 'lucide-react';
import { formatDateTime } from '../../lib/format';
import { displayValue, FIELD_LABEL, STATE_META } from '../../lib/states';
import { buildTimeline } from '../../lib/timeline';
import type { ChangeEntry, TrackRequest } from '../../lib/types';

export function FieldDiff({ entry }: { entry: ChangeEntry }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
        {FIELD_LABEL[entry.field] ?? entry.field}
      </p>
      <div className="flex flex-col gap-1.5 text-sm sm:flex-row sm:items-start">
        <del className="flex-1 whitespace-pre-wrap rounded bg-danger-soft px-2 py-1 text-danger decoration-danger/60">
          {displayValue(entry.field, entry.oldValue)}
        </del>
        <ArrowRight size={16} className="mx-1 mt-1.5 hidden shrink-0 text-ink-faint sm:block" aria-hidden />
        <ins className="flex-1 whitespace-pre-wrap rounded bg-success-soft px-2 py-1 font-medium text-success no-underline">
          {displayValue(entry.field, entry.newValue)}
        </ins>
      </div>
    </div>
  );
}

/** Vertical timeline of the request's history (UI/UX brief figure 5). The changelog is append-only. */
export function ChangelogTimeline({ request }: { request: TrackRequest }) {
  const events = buildTimeline(request);
  return (
    <ol className="relative ml-3 border-l-2 border-line">
      {events.map((ev, i) => (
        <li key={`${ev.at}-${ev.kind}-${i}`} className="relative pb-6 pl-6 last:pb-0">
          <span
            className={`absolute -left-[11px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-surface ${
              ev.kind === 'change' ? 'bg-state-updated text-warn-ink' : 'bg-surface-sunken text-ink-muted'
            }`}
            aria-hidden
          >
            {ev.kind === 'change' ? <Pencil size={11} /> : <CircleDot size={11} />}
          </span>
          <p className="text-sm">
            {ev.kind === 'change' ? (
              <>
                <span className="font-semibold">{ev.actor}</span> edited {ev.entries!.length}{' '}
                {ev.entries!.length === 1 ? 'field' : 'fields'} after authorization
              </>
            ) : (
              <>
                <span className="font-semibold">{ev.actor || 'System'}</span> moved this to{' '}
                <span className={`font-semibold ${STATE_META[ev.to!].text}`}>{STATE_META[ev.to!].label}</span>
              </>
            )}
          </p>
          <time className="text-[12px] text-ink-muted" dateTime={ev.at}>
            {formatDateTime(ev.at)}
          </time>
          {ev.entries && (
            <div className="mt-2 space-y-2">
              {ev.entries.map((e) => (
                <FieldDiff key={e.field} entry={e} />
              ))}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
