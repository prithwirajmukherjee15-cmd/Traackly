import { useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Coffee, Save, XCircle } from 'lucide-react';
import { BoardView } from '../../components/board/Board';
import { ItemPanel } from '../../components/board/ItemPanel';
import { ActivityLog, ItemMeta, PanelLoading, PanelNotFound } from '../../components/board/RequestPanel';
import { groupByState, type BoardGroup } from '../../lib/grouping';
import { RequestDetails } from '../../components/requests/RequestDetails';
import { RequestFormFields } from '../../components/requests/RequestForm';
import { fieldsOf, sameFields, toBody, validateFields } from '../../lib/requestFields';
import { Button } from '../../components/ui/Button';
import { Banner, Card, EmptyState } from '../../components/ui/Feedback';
import { TextArea } from '../../components/ui/Field';
import { Tabs } from '../../components/ui/FilterChips';
import { Modal } from '../../components/ui/Modal';
import { api, ApiError } from '../../lib/api';
import { useRequest, useRequests } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import type { RequestFields, TrackRequest } from '../../lib/types';

type View = 'pending' | 'authorized';

const pendingStages = (items: TrackRequest[]): BoardGroup[] => [
  { key: 'pending', title: 'Awaiting review', tone: 'raised', items },
];
const authorizedStages = (items: TrackRequest[]) =>
  groupByState(items, {
    in_progress: 'In progress',
    updated: 'Updated — awaiting downstream acknowledgment',
  });

/** S-20: pending requests by default, plus already-authorized ones that may still need edits. */
export function AuthorizationQueue() {
  const [view, setView] = useState<View>('pending');
  const pending = useRequests({ view: 'pending' });
  const authorized = useRequests({ view: 'authorized' });
  const current = view === 'pending' ? pending : authorized;
  const items = useMemo(() => current.data ?? [], [current.data]);
  return (
    <>
      <BoardView
        key={view}
        title="Authorization queue"
        description="Approve, edit or decline. Edits after approval are flagged downstream automatically."
        storageKey="authorizer"
        scopes={
          <Tabs
            value={view}
            onChange={setView}
            label="Queue"
            tabs={[
              { value: 'pending', label: 'Pending', count: pending.data?.length },
              { value: 'authorized', label: 'All authorized', count: authorized.data?.length },
            ]}
          />
        }
        items={items}
        stageGroups={view === 'pending' ? pendingStages : authorizedStages}
        columns={['person', 'status', 'department', 'priority', 'timeline', 'updated']}
        href={(r) => `/authorize/${r.id}`}
        loading={current.isLoading}
        error={current.isError}
        empty={
          <EmptyState
            icon={<Coffee size={28} />}
            title={view === 'pending' ? 'No requests waiting for authorization' : 'Nothing authorized yet'}
            body={
              view === 'pending'
                ? "You're all caught up. New requests appear here the moment they're raised."
                : undefined
            }
          />
        }
      />
      <Outlet />
    </>
  );
}

function notifiedCopy(owners: string) {
  return `Change saved — ${owners} ${owners.includes(' and ') ? 'have' : 'has'} been notified`;
}

/** S-21: review a raised request (approve / decline), or edit an authorized one (the core mechanic). */
export function ReviewRequestPage() {
  const { id } = useParams();
  const { data: request, isLoading, error } = useRequest(id);
  if (isLoading) return <PanelLoading closeTo="/authorize" />;
  if (error || !request) return <PanelNotFound closeTo="/authorize" label="Back to queue" />;
  return <ReviewForm request={request} />;
}

function ReviewForm({ request }: { request: TrackRequest }) {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const original = fieldsOf(request);
  const [fields, setFields] = useState<RequestFields>(original);
  const [base, setBase] = useState(request.updatedAt);
  const [busy, setBusy] = useState<'approve' | 'save' | 'decline' | null>(null);
  const [conflict, setConflict] = useState('');
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  const dirty = !sameFields(fields, original);
  // Live updates refresh the form only while the Authorizer has no unsaved edits.
  useEffect(() => {
    if (!dirty) {
      setFields(fieldsOf(request));
      setBase(request.updatedAt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.updatedAt]);

  const errors = validateFields(fields);
  const valid = Object.keys(errors).length === 0;
  const isRaised = request.state === 'raised';
  const editable = isRaised || ['authorization', 'in_progress', 'updated'].includes(request.state);

  const handle = async (kind: 'approve' | 'save' | 'decline', fn: () => Promise<void>) => {
    setBusy(kind);
    setConflict('');
    try {
      await fn();
      await queryClient.invalidateQueries({ queryKey: ['requests'] });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Another session won the race: reload the latest version rather than overwrite it.
        setConflict(err.message);
        const latest = await api.getRequest(request.id).catch(() => null);
        if (latest) {
          queryClient.setQueryData(['requests', 'detail', request.id], latest.request);
          setFields(fieldsOf(latest.request));
          setBase(latest.request.updatedAt);
        }
      } else if (err instanceof ApiError && kind === 'decline' && err.fields.declineReason) {
        setReasonError(err.fields.declineReason);
      } else {
        toast(err instanceof ApiError ? err.message : 'Something went wrong.', 'danger');
      }
    } finally {
      setBusy(null);
    }
  };

  const approve = () =>
    handle('approve', async () => {
      await api.approveRequest(request.id, {
        fields: dirty ? toBody(fields) : undefined,
        expectedUpdatedAt: base,
      });
      toast('Request approved — Logistics notified');
      navigate('/authorize');
    });

  const save = () =>
    handle('save', async () => {
      const r = await api.editRequest(request.id, { ...toBody(fields), expectedUpdatedAt: base });
      setBase(r.request.updatedAt);
      setFields(fieldsOf(r.request));
      queryClient.setQueryData(['requests', 'detail', request.id], r.request);
      toast(r.nextOwners ? notifiedCopy(r.nextOwners) : 'Changes saved');
    });

  const decline = () => {
    if (!reason.trim()) return setReasonError('Enter a reason');
    return handle('decline', async () => {
      await api.declineRequest(request.id, reason.trim(), base);
      setDeclineOpen(false);
      toast('Request declined');
      navigate('/authorize');
    });
  };

  const actions = editable && (
    <>
      <Button variant="secondary" onClick={() => (dirty ? setFields(original) : navigate('/authorize'))}>
        {dirty ? 'Discard changes' : 'Cancel'}
      </Button>
      {isRaised ? (
        <>
          <Button
            variant="destructive"
            icon={<XCircle size={16} />}
            onClick={() => setDeclineOpen(true)}
            disabled={busy !== null}
          >
            Decline
          </Button>
          <Button
            icon={<CheckCircle2 size={16} />}
            onClick={approve}
            loading={busy === 'approve'}
            disabled={!valid}
          >
            {dirty ? 'Save & approve' : 'Approve'}
          </Button>
        </>
      ) : (
        <Button
          variant={dirty ? 'warning' : 'primary'}
          icon={dirty ? <AlertTriangle size={16} /> : <Save size={16} />}
          onClick={save}
          loading={busy === 'save'}
          disabled={!dirty || !valid}
        >
          Save changes
        </Button>
      )}
    </>
  );

  const review = (
    <div className="space-y-4">
      {conflict && <Banner tone="warning">{conflict}</Banner>}
      {!editable ? (
        <RequestDetails request={request} />
      ) : (
        <>
          {!isRaised && (
            <Banner tone={dirty ? 'warning' : 'info'}>
              {dirty
                ? 'Saving will mark this request Updated, log every changed field, and require Logistics (and the floor, if scheduled) to acknowledge before work continues.'
                : 'This request is authorized. Edits are logged and flagged downstream automatically — no re-approval needed.'}
            </Banner>
          )}
          <Card className="p-6">
            <RequestFormFields
              value={fields}
              onChange={setFields}
              errors={errors}
              original={isRaised ? undefined : original}
            />
          </Card>
        </>
      )}
    </div>
  );

  return (
    <ItemPanel
      title={request.clientName}
      closeTo="/authorize"
      meta={<ItemMeta request={request} />}
      footer={actions || undefined}
      tabs={[
        { key: 'review', label: isRaised ? 'Review' : editable ? 'Edit' : 'Details', content: review },
        {
          key: 'activity',
          label: 'Activity log',
          count: request.changelog.length,
          content: <ActivityLog request={request} />,
        },
      ]}
    >
      <Modal
        open={declineOpen}
        title="Decline this request?"
        onClose={() => setDeclineOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeclineOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={decline} loading={busy === 'decline'}>
              Decline request
            </Button>
          </>
        }
      >
        <p className="mb-4 text-ink-muted">
          Declining ends this request. The Coordinator sees your reason and can raise a new request if the
          need remains.
        </p>
        <TextArea
          label="Reason"
          value={reason}
          onChange={(e) => (setReason(e.target.value), setReasonError(''))}
          error={reasonError}
          className="min-h-[100px]"
          maxLength={2000}
        />
      </Modal>
    </ItemPanel>
  );
}
