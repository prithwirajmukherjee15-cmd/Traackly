import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Inbox, Plus } from 'lucide-react';
import { PageHeader } from '../../components/layout/AppShell';
import { ChangelogTimeline } from '../../components/requests/Changelog';
import { RequestBoard } from '../../components/requests/RequestBoard';
import { groupByState } from '../../lib/grouping';
import { RequestFormFields } from '../../components/requests/RequestForm';
import { EMPTY_FIELDS, sameFields, toBody, validateFields } from '../../lib/requestFields';
import { RequestDetails } from '../../components/requests/RequestDetails';
import { Button, LinkButton } from '../../components/ui/Button';
import { Banner, Card, EmptyState, Spinner } from '../../components/ui/Feedback';
import { FilterChips } from '../../components/ui/FilterChips';
import { Modal } from '../../components/ui/Modal';
import { api, ApiError } from '../../lib/api';
import { useRequest, useRequests } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import type { RequestFields, TrackRequest } from '../../lib/types';
import { NotFoundPanel } from '../NotFound';

type Filter = 'all' | 'raised' | 'in_progress' | 'updated' | 'completed';

const matches = (f: Filter, r: TrackRequest) =>
  f === 'all' || r.state === f || (f === 'in_progress' && r.state === 'authorization');

const newRequestButton = (
  <LinkButton to="/requests/new" icon={<Plus size={16} />}>
    New request
  </LinkButton>
);

/** S-10: every request this Coordinator raised, live, filterable client-side. */
export function CoordinatorDashboard() {
  const { data, isLoading, isError } = useRequests();
  const [filter, setFilter] = useState<Filter>('all');
  const all = useMemo(() => data ?? [], [data]);
  const visible = all.filter((r) => matches(filter, r));
  const count = (f: Filter) => all.filter((r) => matches(f, r)).length;
  const needsAttention = count('updated');

  return (
    <>
      <PageHeader
        title="My requests"
        subtitle={
          all.length > 0 &&
          (needsAttention > 0
            ? `${needsAttention} changed after authorization — downstream acknowledgment pending`
            : 'Status updates arrive live — no need to chase.')
        }
        action={all.length > 0 && newRequestButton}
      />
      {isLoading ? (
        <Spinner label="Loading requests" />
      ) : isError ? (
        <div className="px-8">
          <Banner tone="danger">Couldn't load your requests. Retrying…</Banner>
        </div>
      ) : all.length === 0 ? (
        <EmptyState
          icon={<Inbox size={28} />}
          title="You haven't raised any requests yet"
          body="Raise a request and it gets a trackable lifecycle instead of an email thread."
          action={newRequestButton}
        />
      ) : (
        <>
          <div className="px-6 pb-5 lg:px-8">
            <FilterChips
              label="Filter by status"
              value={filter}
              onChange={setFilter}
              chips={[
                { value: 'all', label: 'All', count: all.length },
                { value: 'raised', label: 'Raised', count: count('raised') },
                { value: 'in_progress', label: 'In progress', count: count('in_progress') },
                { value: 'updated', label: 'Updated', count: count('updated') },
                { value: 'completed', label: 'Completed', count: count('completed') },
              ]}
            />
          </div>
          {visible.length === 0 ? (
            <p className="px-8 py-10 text-center text-ink-muted">No requests match this filter.</p>
          ) : (
            <RequestBoard
              groups={groupByState(visible)}
              href={(r) => `/requests/${r.id}`}
              columns={['status', 'department', 'priority', 'timeline', 'updated']}
            />
          )}
        </>
      )}
    </>
  );
}

/** S-11: single-column form; submit stays disabled until valid, and the server re-validates. */
export function NewRequestPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [fields, setFields] = useState<RequestFields>(EMPTY_FIELDS);
  const [touched, setTouched] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [busy, setBusy] = useState(false);

  const errors = validateFields(fields);
  const valid = Object.keys(errors).length === 0;
  const dirty = !sameFields(fields, EMPTY_FIELDS);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    setBusy(true);
    try {
      await api.createRequest(toBody(fields));
      await queryClient.invalidateQueries({ queryKey: ['requests'] });
      toast('Request sent for authorization');
      navigate('/requests');
    } catch (err) {
      setServerErrors(
        err instanceof ApiError ? { ...err.fields, form: err.message } : { form: 'Something went wrong.' },
      );
      setBusy(false);
    }
  };

  const shown = touched ? { ...errors, ...serverErrors } : serverErrors;
  return (
    <>
      <PageHeader
        title="New request"
        subtitle="Goes to the Authorizer first. Any change after approval is flagged to whoever executes it."
        back={<BackLink to="/requests" label="My requests" />}
      />
      <form onSubmit={submit} noValidate className="mx-auto w-full max-w-[560px] px-6 pb-12">
        <Card className="p-6">
          {serverErrors.form && !Object.keys(serverErrors).some((k) => k !== 'form') && (
            <div className="mb-4">
              <Banner tone="danger">{serverErrors.form}</Banner>
            </div>
          )}
          <RequestFormFields
            value={fields}
            onChange={(f) => (setFields(f), setServerErrors({}))}
            errors={shown}
          />
        </Card>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => (dirty ? setConfirmDiscard(true) : navigate('/requests'))}
          >
            Cancel
          </Button>
          <Button type="submit" loading={busy} disabled={!valid}>
            Submit request
          </Button>
        </div>
      </form>
      <Modal
        open={confirmDiscard}
        title="Discard this request?"
        onClose={() => setConfirmDiscard(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDiscard(false)}>
              Keep editing
            </Button>
            <Button variant="destructive" onClick={() => navigate('/requests')}>
              Discard
            </Button>
          </>
        }
      >
        <p className="text-ink-muted">What you've entered will be lost.</p>
      </Modal>
    </>
  );
}

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="mb-2 inline-flex items-center gap-1 text-[13px] font-medium text-ink-muted hover:text-brand"
    >
      <ArrowLeft size={14} /> {label}
    </Link>
  );
}

/** Request detail + activity: read-only and live-updating. Used by S-12 and other office roles. */
export function RequestDetailLayout({
  request,
  back,
  actions,
}: {
  request: TrackRequest;
  back: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <>
      <PageHeader
        title={request.clientName}
        subtitle={<span className="font-mono text-[13px]">{request.jobCode}</span>}
        back={back}
        action={actions}
      />
      <div className="grid gap-6 px-6 pb-12 lg:px-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        <RequestDetails request={request} />
        <Card className="h-fit p-5">
          <h2 className="mb-4 font-display text-base font-semibold">Activity</h2>
          <ChangelogTimeline request={request} />
        </Card>
      </div>
    </>
  );
}

/** S-12: observational for the Coordinator. Unknown or foreign ids render a 404, never a 403. */
export function CoordinatorRequestPage() {
  const { id } = useParams();
  const { data, isLoading, error } = useRequest(id);
  if (isLoading) return <Spinner label="Loading request" />;
  if (error || !data)
    return <NotFoundPanel title="Request not found" to="/requests" label="Back to my requests" />;
  return <RequestDetailLayout request={data} back={<BackLink to="/requests" label="My requests" />} />;
}
