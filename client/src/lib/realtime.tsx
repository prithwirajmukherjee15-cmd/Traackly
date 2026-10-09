import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, UNAUTHORIZED_EVENT } from './api';

export type LiveStatus = 'connecting' | 'open' | 'reconnecting';

const LiveContext = createContext<LiveStatus>('connecting');

/** Fallback poll interval while the socket is down (App Flow S-10: 30-second poll until reconnected). */
export const FALLBACK_POLL_MS = 30_000;
const MAX_BACKOFF_MS = 15_000;

/**
 * Keeps one WebSocket open to /api/ws. Events carry only ids; on each one we invalidate the
 * affected queries so screens refetch through the normal permission-checked REST endpoints.
 */
export function RealtimeProvider({
  children,
  onReconnect,
}: {
  children: ReactNode;
  onReconnect?: () => void;
}) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<LiveStatus>('connecting');
  const reconnectRef = useRef(onReconnect);
  reconnectRef.current = onReconnect;

  useEffect(() => {
    let socket: WebSocket | null = null;
    let timer: number | undefined;
    let attempt = 0;
    let stopped = false;
    let everOpened = false;

    const connect = () => {
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      socket = new WebSocket(`${proto}://${window.location.host}/api/ws`);
      socket.onopen = () => {
        if (everOpened) {
          // Catch up on anything missed while disconnected.
          queryClient.invalidateQueries();
          reconnectRef.current?.();
        }
        everOpened = true;
        attempt = 0;
        setStatus('open');
      };
      socket.onmessage = (msg) => {
        try {
          const ev = JSON.parse(String(msg.data)) as { type: string; requestId?: string };
          if (ev.type === 'request.changed') queryClient.invalidateQueries({ queryKey: ['requests'] });
          if (ev.type === 'users.changed') queryClient.invalidateQueries({ queryKey: ['users'] });
          if (ev.type === 'session.revoked') {
            window.dispatchEvent(
              new CustomEvent(UNAUTHORIZED_EVENT, { detail: new ApiError(401, 'access_removed', 'removed') }),
            );
          }
        } catch {
          // Ignore malformed frames; the next poll or event will resync.
        }
      };
      socket.onclose = () => {
        if (stopped) return;
        setStatus('reconnecting');
        const delay = Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS);
        attempt += 1;
        timer = window.setTimeout(connect, delay);
      };
    };
    connect();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      socket?.close();
    };
  }, [queryClient]);

  return <LiveContext.Provider value={status}>{children}</LiveContext.Provider>;
}

export const useLiveStatus = () => useContext(LiveContext);

/** Poll only while live updates are unavailable. */
export function useFallbackPolling(): number | false {
  return useLiveStatus() === 'open' ? false : FALLBACK_POLL_MS;
}
