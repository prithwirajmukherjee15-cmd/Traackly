import { useCallback, useEffect, useState } from 'react';
import { Link, Outlet, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCheck,
  Flame,
  Hand,
  Loader2,
  LogOut,
  Maximize,
  Play,
  WifiOff,
} from 'lucide-react';
import { Logo } from '../../components/layout/Logo';
import { Barcode } from '../../components/requests/Barcode';
import { FieldDiff } from '../../components/requests/Changelog';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusPill';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate, formatDateTime } from '../../lib/format';
import { RealtimeProvider, useFallbackPolling, useLiveStatus } from '../../lib/realtime';
import { deptLabel, PRIORITY_LABEL } from '../../lib/states';
import type { KioskIdentity, TrackRequest } from '../../lib/types';
import { cachedQueue, cacheQueue, flushAcks, isAckQueued, queueAck } from './offline';

interface KioskCtx {
  identity: KioskIdentity;
  operator: string;
  setOperator: (name: string) => void;
}

const useKiosk = () => useOutletContext<KioskCtx>();

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <span className="tabular-nums">{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
  );
}

function KioskChrome({ identity, operator, setOperator }: KioskCtx) {
  const live = useLiveStatus();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const exit = async () => {
    if (identity.mode === 'supervisor') return logout();
    if (
      !window.confirm(
        'Disconnect this kiosk from its station? An Authorizer will need to provision it again.',
      )
    )
      return;
    await api.stationLogout().catch(() => undefined);
    navigate('/login', { replace: true });
  };
  return (
    <>
      <header className="flex h-20 shrink-0 items-center justify-between gap-6 border-b border-kiosk-line px-8">
        <div className="flex items-center gap-5">
          <Logo inverse />
          <span className="rounded-lg bg-brand px-4 py-1.5 text-xl font-semibold text-ink-inverse">
            {identity.displayName}
          </span>
        </div>
        <div className="flex items-center gap-5 text-lg text-kiosk-muted">
          <label className="flex items-center gap-2">
            <Hand size={20} aria-hidden />
            <span className="sr-only">Operator name</span>
            <input
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              placeholder={identity.mode === 'station' ? 'Your name or badge' : identity.name}
              maxLength={60}
              className="h-12 w-56 rounded-lg border border-kiosk-line bg-kiosk-card px-3 text-lg text-kiosk-ink placeholder:text-kiosk-muted focus:border-brand focus:outline-none"
            />
          </label>
          <Clock />
          <span
            className={`h-3 w-3 rounded-full ${live === 'open' ? 'bg-state-completed' : 'bg-state-updated'}`}
            title={live === 'open' ? 'Live' : 'Reconnecting'}
          />
          <button
            type="button"
            onClick={() => void document.documentElement.requestFullscreen?.().catch(() => undefined)}
            className="rounded-lg p-3 hover:bg-kiosk-card"
            aria-label="Full screen"
          >
            <Maximize size={22} />
          </button>
          <button
            type="button"
            onClick={() => void exit()}
            className="rounded-lg p-3 hover:bg-kiosk-card"
            aria-label="Exit kiosk"
          >
            <LogOut size={22} />
          </button>
        </div>
      </header>
      {live === 'reconnecting' && (
        <div
          role="status"
          className="flex items-center justify-center gap-3 bg-state-updated py-3 text-xl font-semibold text-warn-ink"
        >
          <WifiOff size={24} aria-hidden /> Reconnecting… showing the last known state
        </div>
      )}
    </>
  );
}

/** Kiosk root: resolves the station (or logged-in floor supervisor) and renders the dark full-screen mode. */
export function KioskLayout() {
  const queryClient = useQueryClient();
  const me = useQuery({
    queryKey: ['kiosk-me'],
    queryFn: api.kioskMe,
    retry: (n, e) => !(e instanceof ApiError && e.status < 500) && n < 3,
  });
  const [operator, setOperatorState] = useState(
    () => sessionStorage.getItem('traackly.kiosk.operator') ?? '',
  );
  const setOperator = useCallback((v: string) => {
    setOperatorState(v);
    sessionStorage.setItem('traackly.kiosk.operator', v);
  }, []);

  useEffect(() => {
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
    const onOnline = () =>
      void flushAcks().then(() => queryClient.invalidateQueries({ queryKey: ['requests'] }));
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [queryClient]);

  if (me.isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-kiosk-bg text-kiosk-ink">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }
  if (!me.data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 bg-kiosk-bg px-8 text-center text-kiosk-ink">
        <Logo inverse />
        <h1 className="font-display text-3xl font-semibold">This screen isn't connected to a station</h1>
        <p className="max-w-xl text-xl text-kiosk-muted">
          Ask an Authorizer to provision this department's kiosk link, or log in as a floor supervisor.
        </p>
        <Link to="/login" className="rounded-xl bg-brand px-8 py-4 text-xl font-semibold text-ink-inverse">
          Go to login
        </Link>
      </div>
    );
  }
  const ctx: KioskCtx = { identity: me.data, operator, setOperator };
  return (
    <RealtimeProvider onReconnect={() => void flushAcks()}>
      <div className="flex h-full flex-col bg-kiosk-bg text-kiosk-ink">
        <KioskChrome {...ctx} />
        <main className="min-h-0 flex-1 overflow-y-auto px-8 py-8">
          <Outlet context={ctx} />
        </main>
      </div>
    </RealtimeProvider>
  );
}

/** /kiosk/connect#<token>: one-time station provisioning link opened on the kiosk device. */
export function KioskConnectPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  useEffect(() => {
    const token = window.location.hash.slice(1);
    // Drop the token from the address bar and history straight away.
    window.history.replaceState(null, '', window.location.pathname);
    if (!token) return setError('This station link is incomplete.');
    api
      .stationLogin(token)
      .then(() => queryClient.invalidateQueries({ queryKey: ['kiosk-me'] }))
      .then(() => navigate('/kiosk', { replace: true }))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not connect this kiosk.'));
  }, [navigate, queryClient]);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-kiosk-bg px-8 text-center text-kiosk-ink">
      <Logo inverse />
      {error ? (
        <>
          <h1 className="font-display text-3xl font-semibold">Couldn't connect this kiosk</h1>
          <p className="text-xl text-kiosk-muted">{error}</p>
        </>
      ) : (
        <p className="flex items-center gap-3 text-2xl">
          <Loader2 className="animate-spin" /> Connecting station…
        </p>
      )}
    </div>
  );
}

function JobCard({ job }: { job: TrackRequest }) {
  const flagged = job.pendingAcks.includes('floor') && !isAckQueued(job.id);
  return (
    <Link
      to={`/kiosk/jobs/${job.id}`}
      className={`flex min-h-[220px] flex-col rounded-2xl bg-kiosk-card p-6 transition-transform active:scale-[0.99] ${
        flagged
          ? 'border-4 border-state-updated shadow-[0_0_0_6px_rgb(var(--state-updated)/0.15)]'
          : 'border-2 border-kiosk-line'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-2xl font-semibold tracking-wider">{job.jobCode}</span>
        {flagged ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-state-updated px-4 py-1.5 text-lg font-bold text-warn-ink">
            <AlertTriangle size={20} aria-hidden /> CHANGED
          </span>
        ) : (
          <StatusBadge state={job.workStartedAt ? 'in_progress' : job.state} size="lg" />
        )}
      </div>
      <p className="mt-3 text-2xl font-semibold">{job.clientName}</p>
      <p className="mt-2 line-clamp-2 text-lg text-kiosk-muted">{job.requirementDetails}</p>
      <div className="mt-auto flex items-center gap-4 pt-4 text-lg text-kiosk-muted">
        {job.priority === 'urgent' && (
          <span className="inline-flex items-center gap-1.5 font-semibold text-state-declined">
            <Flame size={20} aria-hidden /> Urgent
          </span>
        )}
        {job.timeline && <span>Due {formatDate(job.timeline.estimate)}</span>}
        <span className="ml-auto">{job.workStartedAt ? 'Started' : 'Queued'}</span>
      </div>
    </Link>
  );
}

/** S-40: this department's shared job queue. */
export function KioskQueuePage() {
  const { identity } = useKiosk();
  const refetchInterval = useFallbackPolling();
  const dept = identity.department;
  const { data, isLoading } = useQuery({
    queryKey: ['requests', 'kiosk', dept],
    queryFn: () => api.kioskQueue(dept).then((r) => (cacheQueue(dept, r.requests), r.requests)),
    initialData: cachedQueue(dept),
    initialDataUpdatedAt: 0,
    refetchInterval,
  });
  if (isLoading && !data) return <Loader2 className="mx-auto mt-20 animate-spin" size={40} />;
  const jobs = [...(data ?? [])].sort(
    (a, b) => Number(b.pendingAcks.includes('floor')) - Number(a.pendingAcks.includes('floor')),
  );
  if (jobs.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <CheckCheck size={64} className="mb-6 text-state-completed" aria-hidden />
        <p className="font-display text-4xl font-semibold">No jobs assigned right now</p>
        <p className="mt-3 text-xl text-kiosk-muted">
          New jobs for {deptLabel(dept)} appear here automatically.
        </p>
      </div>
    );
  }
  const flagged = jobs.filter((j) => j.pendingAcks.includes('floor')).length;
  return (
    <>
      <div className="mb-6 flex items-baseline gap-4">
        <h1 className="font-display text-3xl font-semibold">Job queue</h1>
        <span className="text-xl text-kiosk-muted">
          {jobs.length} active
          {flagged > 0 && (
            <span className="font-semibold text-state-updated">
              {' '}
              · {flagged} changed — review before continuing
            </span>
          )}
        </span>
      </div>
      <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        {jobs.map((j) => (
          <JobCard key={j.id} job={j} />
        ))}
      </div>
    </>
  );
}

/** S-41: full job card. Acknowledging a flagged change is the dominant action until it's done. */
export function KioskJobPage() {
  const { id = '' } = useParams();
  const { operator } = useKiosk();
  const queryClient = useQueryClient();
  const refetchInterval = useFallbackPolling();
  const job = useQuery({
    queryKey: ['requests', 'kiosk-job', id],
    queryFn: () => api.kioskJob(id).then((r) => r.request),
    refetchInterval,
    retry: 1,
  });
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [queued, setQueued] = useState(() => isAckQueued(id));

  if (job.isLoading) return <Loader2 className="mx-auto mt-20 animate-spin" size={40} />;
  if (!job.data) {
    return (
      <div className="mt-20 text-center">
        <p className="text-3xl font-semibold">This job isn't available on this station</p>
        <Link to="/kiosk" className="mt-6 inline-block text-xl text-state-raised underline">
          Back to queue
        </Link>
      </div>
    );
  }
  const j = job.data;
  const floorPending = j.pendingAcks.includes('floor') && !queued;
  const blocked = Boolean(j.floorBlocker);
  const last = j.changelog[j.changelog.length - 1];
  const latestEdit = last ? j.changelog.filter((e) => e.changedAt === last.changedAt) : [];

  const run = async (kind: string, fn: () => Promise<unknown>) => {
    setBusy(kind);
    setMessage('');
    try {
      const r = (await fn()) as { request: TrackRequest };
      queryClient.setQueryData(['requests', 'kiosk-job', id], r.request);
      await queryClient.invalidateQueries({ queryKey: ['requests', 'kiosk'] });
    } catch (err) {
      if (kind === 'ack' && err instanceof ApiError && err.isNetwork) {
        queueAck(id, operator);
        setQueued(true);
        setMessage('Acknowledged on this device — it will sync as soon as the connection returns.');
      } else {
        setMessage(err instanceof ApiError ? err.message : 'Something went wrong.');
      }
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        to="/kiosk"
        className="mb-6 inline-flex min-h-[60px] items-center gap-2 rounded-xl px-4 text-xl text-kiosk-muted hover:bg-kiosk-card"
      >
        <ArrowLeft size={24} /> Back to queue
      </Link>
      {floorPending && (
        <div role="alert" className="mb-6 rounded-2xl border-4 border-state-updated bg-state-updated/10 p-6">
          <p className="flex items-center gap-3 text-2xl font-bold text-state-updated">
            <AlertTriangle size={32} aria-hidden /> This job changed after it reached the floor
          </p>
          <p className="mt-2 text-xl text-kiosk-muted">
            {last && `${last.changedBy.name} edited it ${formatDateTime(last.changedAt)}. `}Read the change,
            then acknowledge before continuing.
          </p>
          <div className="mt-4 space-y-3 text-ink">
            {latestEdit.map((e) => (
              <FieldDiff key={e.field} entry={e} />
            ))}
          </div>
          <Button
            variant="destructive"
            size="kiosk"
            className="mt-6 w-full"
            loading={busy === 'ack'}
            onClick={() => run('ack', () => api.acknowledge(id, operator))}
          >
            Acknowledge change
          </Button>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl bg-kiosk-card p-8">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-mono text-3xl font-bold tracking-wider">{j.jobCode}</span>
            <StatusBadge state={j.state} size="lg" />
            {j.priority === 'urgent' && (
              <span className="text-xl font-semibold text-state-declined">Urgent</span>
            )}
          </div>
          <h1 className="mt-3 font-display text-4xl font-semibold">{j.clientName}</h1>
          <h2 className="mt-8 text-lg font-semibold uppercase tracking-wide text-kiosk-muted">Work sheet</h2>
          <p className="mt-2 whitespace-pre-wrap text-2xl leading-relaxed">{j.requirementDetails}</p>
          <dl className="mt-8 grid grid-cols-2 gap-6 text-xl">
            <div>
              <dt className="text-kiosk-muted">Department</dt>
              <dd className="font-semibold">{deptLabel(j.targetDepartment)}</dd>
            </div>
            <div>
              <dt className="text-kiosk-muted">Priority</dt>
              <dd className="font-semibold">{PRIORITY_LABEL[j.priority]}</dd>
            </div>
            <div>
              <dt className="text-kiosk-muted">Due</dt>
              <dd className="font-semibold">{j.timeline ? formatDate(j.timeline.estimate) : '—'}</dd>
            </div>
            <div>
              <dt className="text-kiosk-muted">Last acknowledged</dt>
              <dd className="font-semibold">
                {j.acknowledged ? `${j.acknowledged.by}, ${formatDateTime(j.acknowledged.at)}` : '—'}
              </dd>
            </div>
          </dl>
        </section>
        <aside className="flex flex-col gap-4">
          <div className="flex justify-center">
            <Barcode value={j.jobCode} height={80} />
          </div>
          {message && (
            <p role="status" className="rounded-xl bg-kiosk-card p-4 text-lg">
              {message}
            </p>
          )}
          {blocked && !floorPending && j.state !== 'completed' && (
            <p className="rounded-xl bg-kiosk-card p-4 text-lg text-state-updated">{j.floorBlocker}</p>
          )}
          {j.state !== 'completed' ? (
            <>
              <Button
                size="kiosk"
                variant="secondary"
                className="w-full !border-kiosk-line !bg-kiosk-card !text-kiosk-ink"
                icon={<Play size={24} />}
                disabled={blocked || Boolean(j.workStartedAt)}
                title={blocked ? 'Acknowledge the change first' : undefined}
                loading={busy === 'start'}
                onClick={() => run('start', () => api.startJob(id, operator))}
              >
                {j.workStartedAt ? 'In progress' : 'Mark in progress'}
              </Button>
              <Button
                size="kiosk"
                className="w-full !bg-state-completed !text-ink"
                icon={<CheckCheck size={24} />}
                disabled={blocked}
                title={blocked ? 'Acknowledge the change first' : undefined}
                loading={busy === 'done'}
                onClick={() => run('done', () => api.completeJob(id, operator))}
              >
                Mark done
              </Button>
            </>
          ) : (
            <p className="rounded-xl bg-state-completed p-5 text-center text-2xl font-bold text-ink">
              Job completed
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
