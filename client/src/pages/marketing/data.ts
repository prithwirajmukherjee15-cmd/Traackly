import { ClipboardCheck, LayoutList, MonitorSmartphone, Truck } from 'lucide-react';
import type { MockRow } from './Mockups';

export type RoleKey = 'coordinator' | 'authorizer' | 'logistics' | 'floor';

export const ROLES: { key: RoleKey; label: string; icon: typeof LayoutList }[] = [
  { key: 'coordinator', label: 'Coordinator', icon: LayoutList },
  { key: 'authorizer', label: 'Authorizer', icon: ClipboardCheck },
  { key: 'logistics', label: 'Logistics', icon: Truck },
  { key: 'floor', label: 'Floor kiosk', icon: MonitorSmartphone },
];

export const DEMO_ROWS: MockRow[] = [
  {
    name: 'Railway workshop — brush holders',
    dept: 'Prod.',
    state: 'updated',
    owner: 'Meera Iyer',
    urgent: true,
  },
  { name: 'Kirloskar — slip rings', dept: 'Prod.', state: 'in_progress', owner: 'Arjun Rao' },
  { name: 'BHEL — carbon brushes', dept: 'Supply', state: 'raised', owner: 'Meera Iyer', urgent: true },
  { name: 'L&T Hazira — ring assembly', dept: 'Prod.', state: 'completed', owner: 'Sunil Patil' },
];
