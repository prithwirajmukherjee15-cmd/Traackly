import { api, ApiError } from '../../lib/api';
import type { TrackRequest } from '../../lib/types';

// Warehouse Wi-Fi drops (TRD section 10). Acknowledgments tapped while offline are queued
// here and retried on reconnect; cached queues let the kiosk show its last known state.

const ACK_KEY = 'traackly.kiosk.pendingAcks';
const queueKey = (dept: string) => `traackly.kiosk.queue.${dept}`;

export interface QueuedAck {
  id: string;
  name: string;
  at: string;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the kiosk still works online, it just can't persist offline state.
  }
}

export const pendingAcks = (): QueuedAck[] => read<QueuedAck[]>(ACK_KEY, []);

export function queueAck(id: string, name: string) {
  const rest = pendingAcks().filter((a) => a.id !== id);
  write(ACK_KEY, [...rest, { id, name, at: new Date().toISOString() }]);
}

export const isAckQueued = (id: string) => pendingAcks().some((a) => a.id === id);

/**
 * Retries queued acknowledgments in order. A server-side rejection (e.g. someone else already
 * acknowledged, or the job changed) is dropped silently: the server state is the truth.
 * Stops at the first network failure and keeps the rest for the next attempt.
 */
export async function flushAcks(): Promise<number> {
  let flushed = 0;
  for (const ack of pendingAcks()) {
    try {
      await api.acknowledge(ack.id, ack.name);
    } catch (err) {
      if (err instanceof ApiError && err.isNetwork) break;
    }
    write(
      ACK_KEY,
      pendingAcks().filter((a) => a.id !== ack.id),
    );
    flushed += 1;
  }
  return flushed;
}

export const cachedQueue = (dept: string): TrackRequest[] | undefined =>
  read<TrackRequest[] | undefined>(queueKey(dept), undefined);
export const cacheQueue = (dept: string, jobs: TrackRequest[]) => write(queueKey(dept), jobs);
