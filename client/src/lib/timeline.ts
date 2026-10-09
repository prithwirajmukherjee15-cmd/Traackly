import type { ChangeEntry, TrackRequest } from './types';

export interface Event {
  at: string;
  kind: 'change' | 'status';
  actor: string;
  entries?: ChangeEntry[];
  to?: TrackRequest['state'];
  /** Recorded order, used to break timestamp ties. */
  seq: number;
}

/** Merges changelog entries (grouped per edit) and status transitions into one chronological stream. */
export function buildTimeline(r: TrackRequest): Event[] {
  const edits = new Map<string, ChangeEntry[]>();
  for (const e of r.changelog) edits.set(e.changedAt, [...(edits.get(e.changedAt) ?? []), e]);
  const events: Event[] = [...edits.entries()].map(([at, entries]) => ({
    at,
    kind: 'change',
    actor: entries[0]!.changedBy.name,
    entries,
    seq: -1,
  }));
  r.statusHistory.forEach((s, seq) =>
    events.push({ at: s.at, kind: 'status', actor: s.actor, to: s.to, seq }),
  );
  // Newest first. At equal timestamps the edit sits above the status change it caused,
  // and transitions keep their recorded order (later first).
  const kindRank = (e: Event) => (e.kind === 'change' ? 1 : 0);
  return events.sort((a, b) => b.at.localeCompare(a.at) || kindRank(b) - kindRank(a) || b.seq - a.seq);
}
