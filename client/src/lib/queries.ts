import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { useFallbackPolling } from './realtime';

// Every request-related key starts with 'requests' so one real-time event invalidates them all.

export function useRequests(params: { view?: string; state?: string } = {}) {
  const refetchInterval = useFallbackPolling();
  return useQuery({
    queryKey: ['requests', 'list', params],
    queryFn: () => api.listRequests(params).then((r) => r.requests),
    refetchInterval,
  });
}

export function useRequest(id: string | undefined) {
  const refetchInterval = useFallbackPolling();
  return useQuery({
    queryKey: ['requests', 'detail', id],
    queryFn: () => api.getRequest(id!).then((r) => r.request),
    enabled: Boolean(id),
    refetchInterval,
    retry: (count, err) => (err as { status?: number }).status !== 404 && count < 2,
  });
}

export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: () => api.listUsers().then((r) => r.users) });
}

export function useStations() {
  return useQuery({ queryKey: ['stations'], queryFn: () => api.listStations().then((r) => r.stations) });
}
