import { useMemo, useState, type FormEvent } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Inbox, Plus } from 'lucide-react';
import { BoardView, PrimaryLink } from '../../components/board/Board';
import { ItemPanel } from '../../components/board/ItemPanel';
import { PanelLoading, PanelNotFound, RequestDetailPanel } from '../../components/board/RequestPanel';
import { groupByState } from '../../lib/grouping';
import { RequestFormFields } from '../../components/requests/RequestForm';
import { EMPTY_FIELDS, sameFields, toBody, validateFields } from '../../lib/requestFields';
import { Button, LinkButton } from '../../components/ui/Button';
import { Banner, Card, EmptyState } from '../../components/ui/Feedback';
import { Modal } from '../../components/ui/Modal';
import { api, ApiError } from '../../lib/api';
import { useRequest, useRequests } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import type { RequestFields, TrackRequest } from '../../lib/types';

const coordinatorStages = (items: TrackRequest[]) => groupByState(items);

/** S-10: every request this Coordinator raised, live; search, filter, sort and group client-side. */
export function CoordinatorDashboard() {
  const { data, isLoading, isError } = useRequests();
  const all = useMemo(() => data ?? [], [data]);
  const needsAttention = all.filter((r) => r.state === 'updated').length;

  return (
    <>
      <BoardView
        title="My requests"
        storageKey="coordinator"
        description={
          all.length > 0 &&
          (needsAttention > 0
            ? `${needsAttention} changed after authorization — downstream acknowledgment pending`
            : 'Status updates arrive live — no need to chase.')
        }
        items={all}
        stageGroups={coordinatorStages}
        columns={['status', 'department', 'priority', 'timeline', 'updated', 'code']}
        href={(r) => `/requests/${r.id}`}
        primary={
          <PrimaryLink to="/requests/new">
            <Plus size={16} aria-hidden /> New request
          </PrimaryLink>
        }
        addHref="/requests/new"
        loading={isLoading}
        error={isError}
        empty={
          <EmptyState
            icon={<Inbox size={28} />}
            title="You haven't raised any requests yet"
            body="Raise a request and it gets a trackable lifecycle instead of an email thread."
            action={
              <LinkButton to="/requests/new" icon={<Plus size={16} />}>
                New request
              </LinkButton>
            }
          />
        }
      />
      <Outlet />
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
  const leave = () => navigate('/requests');
  return (
    <ItemPanel
      title="New request"
      closeTo="/requests"
      onRequestClose={() => (dirty ? setConfirmDiscard(true) : leave())}
      meta="Goes to the Authorizer first. Any change after approval is flagged to whoever executes it."
      footer={
        <>
          <Button variant="secondary" onClick={() => (dirty ? setConfirmDiscard(true) : leave())}>
            Cancel
          </Button>
          <Button type="submit" form="new-request-form" loading={busy} disabled={!valid}>
            Submit request
          </Button>
        </>
      }
    >
      <form id="new-request-form" onSubmit={submit} noValidate className="max-w-[640px]">
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
            <Button variant="destructive" onClick={leave}>
              Discard
            </Button>
          </>
        }
      >
        <p className="text-ink-muted">What you've entered will be lost.</p>
      </Modal>
    </ItemPanel>
  );
}

/** S-12: observational for the Coordinator. Unknown or foreign ids render a 404, never a 403. */
export function CoordinatorRequestPage() {
  const { id } = useParams();
  const { data, isLoading, error } = useRequest(id);
  if (isLoading) return <PanelLoading closeTo="/requests" />;
  if (error || !data) return <PanelNotFound closeTo="/requests" label="Back to my requests" />;
  return <RequestDetailPanel request={data} closeTo="/requests" />;
}
