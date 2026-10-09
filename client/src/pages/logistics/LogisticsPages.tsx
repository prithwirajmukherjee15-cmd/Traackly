import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarCheck, CalendarClock, Truck } from 'lucide-react';
import { PageHeader } from '../../components/layout/AppShell';
import { ChangelogTimeline, FieldDiff } from '../../components/requests/Changelog';
import { RequestBoard } from '../../components/requests/RequestBoard';
import { groupByState } from '../../lib/grouping';
import { RequestDetails } from '../../components/requests/RequestDetails';
import { Button } from '../../components/ui/Button';
import { Banner, Card, EmptyState, Spinner } from '../../components/ui/Feedback';
import { TextInput } from '../../components/ui/Field';
import { Tabs } from '../../components/ui/FilterChips';
import { api, ApiError } from '../../lib/api';
import { dateInputToISO, formatDateTime, isoToDateInput } from '../../lib/format';
import { useRequest, useRequests } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import type { TrackRequest } from '../../lib/types';
import { BackLink } from '../coordinator/CoordinatorPages';
import { NotFoundPanel } from '../NotFound';

type View = 'queue' | 'scheduled';

/** S-30: newly authorized requests needing a timeline, and changed ones needing a revision. */
export function LogisticsQueue() {
  const [view, setView] = useState<View>('queue');
  const queue = useRequests({});
  const scheduled = useRequests({ view: 'scheduled' });
  const current = view === 'queue' ? queue : scheduled;
  const items = current.data ?? [];
  const revisions = items.filter((r) => r.pendingAcks.includes('logistics'));
  const fresh = items.filter((r) => !revisions.includes(r));
  return (
    <>
      <PageHeader
        title="Logistics queue"
        subtitle="Set execution timelines. Saving a timeline passes the job to its department's floor kiosk."
      />
      <div className="px-6 pb-5 lg:px-8">
        <Tabs
          value={view}
          onChange={setView}
          tabs={[
            { value: 'queue', label: 'Needs a timeline', count: queue.data?.length },
            { value: 'scheduled', label: 'Scheduled', count: scheduled.data?.length },
          ]}
        />
      </div>
      {current.isLoading ? (
        <Spinner label="Loading queue" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Truck size={28} />}
          title={view === 'queue' ? 'No requests need a timeline right now' : 'Nothing scheduled yet'}
          body={
            view === 'queue'
              ? 'Newly authorized requests and post-approval changes will appear here.'
              : undefined
          }
        />
      ) : view === 'queue' ? (
        <RequestBoard
          groups={[
            {
              key: 'revise',
              title: 'Changed after authorization — review & revise timeline',
              tone: 'updated',
              items: revisions,
            },
            { key: 'new', title: 'Needs a timeline', tone: 'in_progress', items: fresh },
          ]}
          href={(r) => `/logistics/requests/${r.id}`}
          columns={['status', 'department', 'priority', 'timeline', 'updated']}
        />
      ) : (
        <RequestBoard
          groups={groupByState(items)}
          href={(r) => `/logistics/requests/${r.id}`}
          columns={['status', 'department', 'priority', 'timeline', 'updated']}
        />
      )}
    </>
  );
}

/** The most recent edit (all fields changed at the same moment). */
function latestEdit(r: TrackRequest) {
  const last = r.changelog[r.changelog.length - 1];
  return last ? r.changelog.filter((e) => e.changedAt === last.changedAt) : [];
}

/** S-31: set or revise the estimate. For an updated request this is Logistics' acknowledgment. */
export function TimelinePage() {
  const { id } = useParams();
  const { data: request, isLoading, error } = useRequest(id);
  if (isLoading) return <Spinner label="Loading request" />;
  if (error || !request)
    return <NotFoundPanel title="Request not found" to="/logistics" label="Back to queue" />;
  return <TimelineForm request={request} />;
}

function TimelineForm({ request }: { request: TrackRequest }) {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(request.timeline ? isoToDateInput(request.timeline.estimate) : '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const needsAck = request.pendingAcks.includes('logistics');
  const edit = latestEdit(request);
  const open = request.state === 'in_progress' || request.state === 'updated';
  const today = isoToDateInput(new Date().toISOString());

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!date || date < today) return setError('Select a valid future date');
    setBusy(true);
    try {
      await api.setTimeline(request.id, dateInputToISO(date));
      await queryClient.invalidateQueries({ queryKey: ['requests'] });
      toast('Timeline set — passed to Floor Supervisor');
      navigate('/logistics');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.fields.estimate
            ? 'Select a valid future date'
            : err.message
          : 'Something went wrong.',
      );
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title={request.timeline ? 'Revise timeline' : 'Set timeline'}
        subtitle={
          <span>
            {request.clientName} · <span className="font-mono text-[13px]">{request.jobCode}</span>
          </span>
        }
        back={<BackLink to="/logistics" label="Logistics queue" />}
      />
      <div className="grid gap-6 px-6 pb-12 lg:px-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          {needsAck && edit.length > 0 && (
            <Card className="border-state-updated p-5">
              <div className="mb-3 flex items-center gap-2">
                <CalendarClock className="text-warn-ink" size={20} aria-hidden />
                <h2 className="font-display text-base font-semibold">
                  This request changed after authorization
                </h2>
              </div>
              <p className="mb-3 text-sm text-ink-muted">
                {edit[0]!.changedBy.name} edited it {formatDateTime(edit[0]!.changedAt)}. Review the change
                and confirm or revise the timeline — saving acknowledges it for Logistics.
              </p>
              <div className="space-y-2">
                {edit.map((e) => (
                  <FieldDiff key={e.field} entry={e} />
                ))}
              </div>
            </Card>
          )}
          {open ? (
            <form onSubmit={submit} noValidate>
              <Card className="flex flex-wrap items-end gap-4 p-5">
                <div className="min-w-[220px] flex-1">
                  <TextInput
                    label="Estimated completion date"
                    type="date"
                    min={today}
                    value={date}
                    onChange={(e) => (setDate(e.target.value), setError(''))}
                    error={error}
                  />
                </div>
                <Button
                  type="submit"
                  loading={busy}
                  icon={<CalendarCheck size={16} />}
                  variant={needsAck ? 'warning' : 'primary'}
                >
                  {needsAck ? 'Acknowledge & save timeline' : 'Save timeline'}
                </Button>
              </Card>
            </form>
          ) : (
            <Banner tone="info">This request is closed; its timeline can no longer change.</Banner>
          )}
          <RequestDetails request={request} />
        </div>
        <Card className="h-fit p-5">
          <h2 className="mb-4 font-display text-base font-semibold">Activity & changelog</h2>
          <ChangelogTimeline request={request} />
        </Card>
      </div>
    </>
  );
}
