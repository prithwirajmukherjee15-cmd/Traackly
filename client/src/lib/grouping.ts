import type { RequestState, TrackRequest } from './types';

export interface BoardGroup {
  key: string;
  title: string;
  /** Group color follows a lifecycle state. */
  tone: RequestState;
  items: TrackRequest[];
}

/** Groups requests by lifecycle state in attention order: changed first, then open work, then closed. */
export function groupByState(
  requests: TrackRequest[],
  titles: Partial<Record<RequestState, string>> = {},
): BoardGroup[] {
  const order: RequestState[] = [
    'updated',
    'raised',
    'authorization',
    'in_progress',
    'completed',
    'declined',
  ];
  const defaults: Record<RequestState, string> = {
    updated: 'Updated — changes awaiting acknowledgment',
    raised: 'Raised — awaiting authorization',
    authorization: 'Authorizing',
    in_progress: 'In progress',
    completed: 'Completed',
    declined: 'Declined',
  };
  return order.map((s) => ({
    key: s,
    title: titles[s] ?? defaults[s],
    tone: s,
    items: requests.filter((r) => r.state === s),
  }));
}
