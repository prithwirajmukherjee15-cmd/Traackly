import type { TrackRequest } from '../lib/types';

export function makeRequest(over: Partial<TrackRequest> = {}): TrackRequest {
  return {
    id: 'r1',
    jobCode: 'TRK-ABC123',
    clientName: 'Indian Railways',
    requirementDetails: 'Brush holders BH-40',
    targetDepartment: 'production',
    priority: 'normal',
    state: 'in_progress',
    raisedBy: { id: 'u1', name: 'Meera Iyer' },
    declineReason: null,
    timeline: null,
    changelog: [],
    statusHistory: [],
    pendingAcks: [],
    acknowledged: null,
    workStartedAt: null,
    completedAt: null,
    floorBlocker: '',
    risk: { atRisk: false, reasons: [] },
    createdAt: '2026-08-01T09:00:00.000Z',
    updatedAt: '2026-08-01T09:00:00.000Z',
    ...over,
  };
}
