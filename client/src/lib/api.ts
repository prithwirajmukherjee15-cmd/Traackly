import type { KioskIdentity, Station, TrackRequest, User } from './types';

/** An error returned by the Traackly API, or a network failure (status 0). */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }

  get isNetwork() {
    return this.status === 0;
  }
}

/** Fired when the server says the session is gone, so the auth layer can redirect to login. */
export const UNAUTHORIZED_EVENT = 'traackly:unauthorized';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'network', 'Can’t reach Traackly — check your connection.');
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const err = data?.error ?? {};
    const apiErr = new ApiError(
      res.status,
      err.code ?? 'unknown',
      err.message ?? 'Something went wrong.',
      err.fields,
    );
    if (res.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/kiosk')) {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, { detail: apiErr }));
    }
    throw apiErr;
  }
  return data as T;
}

const get = <T>(path: string) => request<T>('GET', path);
const post = <T>(path: string, body: unknown = {}) => request<T>('POST', path, body);
const patch = <T>(path: string, body: unknown) => request<T>('PATCH', path, body);
const del = <T>(path: string) => request<T>('DELETE', path);

type RequestRes = { request: TrackRequest; nextOwners?: string };
type FieldsBody = {
  clientName: string;
  requirementDetails: string;
  targetDepartment: string;
  priority: string;
  expectedUpdatedAt?: string;
};

export const api = {
  // Auth & account (S-00..S-04, S-90)
  login: (email: string, password: string) => post<{ user: User }>('/auth/login', { email, password }),
  logout: () => post<{ ok: boolean }>('/auth/logout'),
  me: () => get<{ user: User }>('/auth/me'),
  forgotPassword: (email: string) =>
    post<{ ok: boolean; devLink?: string }>('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string, confirmPassword: string) =>
    post<{ ok: boolean }>(`/auth/reset-password/${encodeURIComponent(token)}`, { password, confirmPassword }),
  inviteInfo: (token: string) =>
    get<{ name: string; email: string }>(`/users/activate/${encodeURIComponent(token)}`),
  activate: (token: string, password: string, confirmPassword: string) =>
    post<{ email: string }>(`/users/activate/${encodeURIComponent(token)}`, { password, confirmPassword }),

  // Requests
  listRequests: (params: { view?: string; state?: string } = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]);
    return get<{ requests: TrackRequest[] }>(`/requests${q.size ? `?${q}` : ''}`);
  },
  getRequest: (id: string) => get<RequestRes>(`/requests/${id}`),
  createRequest: (body: FieldsBody) => post<RequestRes>('/requests', body),
  editRequest: (id: string, body: FieldsBody) => patch<RequestRes>(`/requests/${id}`, body),
  approveRequest: (id: string, body: { fields?: FieldsBody; expectedUpdatedAt: string }) =>
    post<RequestRes>(`/requests/${id}/approve`, body),
  declineRequest: (id: string, reason: string, expectedUpdatedAt: string) =>
    post<RequestRes>(`/requests/${id}/decline`, { reason, expectedUpdatedAt }),
  setTimeline: (id: string, estimate: string) => post<RequestRes>(`/requests/${id}/timeline`, { estimate }),

  // Team & stations (S-91)
  listUsers: () => get<{ users: User[] }>('/users'),
  invite: (body: { name: string; email: string; role: string; department: string }) =>
    post<{ user: User; devLink?: string }>('/users/invite', body),
  resendInvite: (id: string) => post<{ ok: boolean; devLink?: string }>(`/users/${id}/resend-invite`),
  deactivate: (id: string) => patch<{ ok: boolean }>(`/users/${id}`, { status: 'deactivated' }),
  listStations: () => get<{ stations: Station[] }>('/stations'),
  provisionStation: (dept: string) => post<{ token: string; url: string }>(`/stations/${dept}`),
  revokeStation: (dept: string) => del<{ ok: boolean }>(`/stations/${dept}`),

  // Kiosk (S-40, S-41)
  stationLogin: (token: string) => post<KioskIdentity>('/kiosk/session', { token }),
  stationLogout: () => del<{ ok: boolean }>('/kiosk/session'),
  kioskMe: () => get<KioskIdentity>('/kiosk/me'),
  kioskQueue: (dept: string) => get<{ requests: TrackRequest[] }>(`/departments/${dept}/queue`),
  kioskJob: (id: string) => get<RequestRes>(`/kiosk/jobs/${id}`),
  acknowledge: (id: string, name: string) => post<RequestRes>(`/requests/${id}/acknowledge`, { name }),
  startJob: (id: string, name: string) => post<RequestRes>(`/kiosk/jobs/${id}/start`, { name }),
  completeJob: (id: string, name: string) => post<RequestRes>(`/kiosk/jobs/${id}/complete`, { name }),
};

export type { FieldsBody };
