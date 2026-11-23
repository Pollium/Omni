import BaseQueue from '@readable/queues/BaseQueue';
import DeliveryQueue from '../queues/Delivery';
import Webhooks from '../services/Webhooks';
import { enqueued, useWebhooks } from '@tests/harness';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Webhooks', () => {
    const webhooks = new Webhooks();

    beforeEach(() => {
        vi.mocked(BaseQueue.prototype.add).mockClear();
    });

    it('publishes nothing while no receiver is configured', async () => {
        await webhooks.publish('team.removed', { teamId: 'team-1' });

        expect(BaseQueue.prototype.add).not.toHaveBeenCalled();
    });

    describe('with a webhook receiver', () => {
        useWebhooks();

        it('queues one delivery per event, keyed by its id so a retried publish never doubles it', async () => {
            await webhooks.publish('session.revoked', {
                userId: 'user-1',
                cutoff: 1_800_000_000
            });

            const [delivery] = enqueued(DeliveryQueue);
            expect(delivery).toEqual({
                id: expect.stringMatching(/^[0-9a-f-]{36}$/),
                type: 'session.revoked',
                payload: {
                    userId: 'user-1',
                    cutoff: 1_800_000_000
                },
                occurredAt: expect.any(String)
            });

            expect(Math.abs(Date.parse(delivery.occurredAt) - Date.now())).toBeLessThan(5_000);
            expect(BaseQueue.prototype.add).toHaveBeenCalledExactlyOnceWith(delivery, { jobId: delivery.id });
        });

        it('gives every delivery its own id', async () => {
            await webhooks.publish('team.removed', { teamId: 'team-1' });
            await webhooks.publish('team.removed', { teamId: 'team-1' });

            const [first, second] = enqueued(DeliveryQueue);
            expect(first.id).not.toBe(second.id);
        });
    });
});
