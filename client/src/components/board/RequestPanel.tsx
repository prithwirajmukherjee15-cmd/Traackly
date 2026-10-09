import type { TrackRequest } from '../../lib/types';
import { ChangelogTimeline } from '../requests/Changelog';
import { RequestDetails } from '../requests/RequestDetails';
import { PendingAckTag, RiskFlag } from '../requests/Tags';
import { Card, Spinner } from '../ui/Feedback';
import { NotFoundPanel } from '../../pages/NotFound';
import { StatusBadge } from '../ui/StatusPill';
import { ItemPanel } from './ItemPanel';

/** Header line under an item's title: job code, status and any flags. */
export function ItemMeta({ request }: { request: TrackRequest }) {
  return (
    <>
      <span className="font-mono">{request.jobCode}</span>
      <StatusBadge state={request.state} />
      <PendingAckTag request={request} />
      <RiskFlag request={request} />
    </>
  );
}

/** The Activity log tab body: the request's append-only history. */
export function ActivityLog({ request }: { request: TrackRequest }) {
  return (
    <Card className="p-5">
      <ChangelogTimeline request={request} />
    </Card>
  );
}

/** Request detail + activity in the item panel: read-only and live-updating. */
export function RequestDetailPanel({ request, closeTo }: { request: TrackRequest; closeTo: string }) {
  return (
    <ItemPanel
      title={request.clientName}
      closeTo={closeTo}
      meta={<ItemMeta request={request} />}
      tabs={[
        { key: 'details', label: 'Details', content: <RequestDetails request={request} /> },
        {
          key: 'activity',
          label: 'Activity log',
          count: request.changelog.length,
          content: <ActivityLog request={request} />,
        },
      ]}
    />
  );
}

/** Panel shown while an item loads. */
export function PanelLoading({ closeTo }: { closeTo: string }) {
  return (
    <ItemPanel title="Loading…" closeTo={closeTo}>
      <Spinner label="Loading request" />
    </ItemPanel>
  );
}

/** Unknown or foreign ids render a 404 inside the panel, never a 403. */
export function PanelNotFound({ closeTo, label }: { closeTo: string; label: string }) {
  return (
    <ItemPanel title="Request not found" closeTo={closeTo}>
      <NotFoundPanel title="Request not found" to={closeTo} label={label} />
    </ItemPanel>
  );
}
