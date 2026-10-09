// API contract types. Field names match the server DTOs exactly (App Flow section 2).

export type RequestState = 'raised' | 'authorization' | 'in_progress' | 'updated' | 'completed' | 'declined';
export type Department = 'production' | 'supply' | 'qa';
export type Priority = 'normal' | 'urgent';
export type Role = 'coordinator' | 'authorizer' | 'logistics' | 'floor_supervisor';
export type UserStatus = 'invited' | 'active' | 'deactivated';
export type AckStage = 'logistics' | 'floor';

export interface PersonRef {
  id: string;
  name: string;
}

export interface ChangeEntry {
  field: string;
  oldValue: string;
  newValue: string;
  changedBy: PersonRef;
  changedAt: string;
}

export interface StatusEntry {
  from: RequestState | '';
  to: RequestState;
  actor: string;
  at: string;
}

export interface TrackRequest {
  id: string;
  jobCode: string;
  clientName: string;
  requirementDetails: string;
  targetDepartment: Department;
  priority: Priority;
  state: RequestState;
  raisedBy: PersonRef;
  declineReason: string | null;
  timeline: { estimate: string; setBy: PersonRef; setAt: string } | null;
  changelog: ChangeEntry[];
  statusHistory: StatusEntry[];
  pendingAcks: AckStage[];
  acknowledged: { by: string; at: string } | null;
  workStartedAt: string | null;
  completedAt: string | null;
  floorBlocker: string;
  risk: { atRisk: boolean; reasons: string[] };
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: Department | null;
  status: UserStatus;
  invitedAt: string | null;
  activatedAt: string | null;
}

export interface RequestFields {
  clientName: string;
  requirementDetails: string;
  targetDepartment: Department | '';
  priority: Priority;
}

export interface KioskIdentity {
  department: Department;
  displayName: string;
  mode: 'station' | 'supervisor';
  name: string;
}

export interface Station {
  department: Department;
  revoked: boolean;
  provisionedAt: string;
}
