import { ApiError } from '../../lib/api';
import { cachedQueue, cacheQueue, flushAcks, isAckQueued, pendingAcks, queueAck } from './offline';

const acknowledge = vi.fn();
vi.mock('../../lib/api', async (orig) => {
  const mod = await orig<typeof import('../../lib/api')>();
  return { ...mod, api: { acknowledge: (...a: unknown[]) => acknowledge(...a) } };
});

beforeEach(() => {
  localStorage.clear();
  acknowledge.mockReset();
});

describe('offline acknowledgment queue', () => {
  it('queues once per job and reports it', () => {
    queueAck('j1', 'Sunil');
    queueAck('j1', 'Sunil again');
    expect(pendingAcks()).toHaveLength(1);
    expect(isAckQueued('j1')).toBe(true);
    expect(isAckQueued('j2')).toBe(false);
  });

  it('flushes successes and silently drops server rejections', async () => {
    queueAck('ok', 'A');
    queueAck('gone', 'B');
    acknowledge
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new ApiError(404, 'not_found', 'Request not found'));
    expect(await flushAcks()).toBe(2);
    expect(pendingAcks()).toEqual([]);
    expect(acknowledge).toHaveBeenCalledWith('ok', 'A');
  });

  it('stops at the first network failure and keeps the rest', async () => {
    queueAck('a', '');
    queueAck('b', '');
    acknowledge.mockRejectedValueOnce(new ApiError(0, 'network', 'offline'));
    expect(await flushAcks()).toBe(0);
    expect(pendingAcks().map((a) => a.id)).toEqual(['a', 'b']);
  });

  it('caches the last known queue per department', () => {
    expect(cachedQueue('qa')).toBeUndefined();
    cacheQueue('qa', []);
    expect(cachedQueue('qa')).toEqual([]);
  });
});
