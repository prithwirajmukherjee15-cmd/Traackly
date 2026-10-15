import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { Role } from './types';

/** True only on the public demo deployment, where the server answers GET /api/demo. */
export function useDemoMode() {
  const { data } = useQuery({
    queryKey: ['demo'],
    queryFn: () =>
      api
        .demoInfo()
        .then((r) => r.enabled)
        .catch(() => false),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
  return data === true;
}

export interface DemoRole {
  role: Role;
  title: string;
  person: string;
  sees: string;
}

/** The four sample accounts, in the order a request moves through the company. */
export const DEMO_ROLES: DemoRole[] = [
  {
    role: 'coordinator',
    title: 'Coordinator',
    person: 'Meera Iyer',
    sees: 'Raise client orders and watch every one move on a live board.',
  },
  {
    role: 'authorizer',
    title: "Founder's office",
    person: 'Approves orders',
    sees: 'Approve, decline or change an order. Changes after approval get flagged downstream.',
  },
  {
    role: 'logistics',
    title: 'Logistics',
    person: 'Arjun Rao',
    sees: 'Set delivery timelines. Changed orders jump to the top of the queue.',
  },
  {
    role: 'floor_supervisor',
    title: 'Floor kiosk',
    person: 'Production floor',
    sees: 'The shared shop-floor screen. A changed job is locked until someone acknowledges it.',
  },
];

/** The one path that shows why Traackly exists. */
export const DEMO_STORY =
  "Try this: open the Floor kiosk and find the railway order flagged as changed. Then switch to Founder's office, edit the Kirloskar Motors order (it's already on the floor), and watch the kiosk lock it until someone acknowledges.";
