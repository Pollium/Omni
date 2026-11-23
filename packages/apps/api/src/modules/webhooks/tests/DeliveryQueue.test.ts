import DeliveryQueue from '../queues/Delivery';
import { SIGNATURE_HEADER, WebhookDelivery } from '@omni/contracts/webhooks/domain';
import { WEBHOOK_URL, expectSigned, useWebhooks } from '@tests/harness';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const DELIVERY: WebhookDelivery = {
    id: '0193a5d2-7c4e-7000-8000-000000000001',
    type: 'user.removed',
    payload: { userId: '0193a5d2-7c4e-7000-8000-000000000002' },
    occurredAt: '2026-11-23T12:00:00.000Z'
};

describe('DeliveryQueue', () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const queue = new DeliveryQueue();

    useWebhooks();

    beforeEach(() => {
        vi.stubGlobal('fetch', fetch);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        fetch.mockReset();
    });

    it('posts the delivery as JSON to the receiver, signed with the service key', async () => {
        fetch.mockResolvedValue(new Response(null, { status: 204 }));

        await queue.process(DELIVERY);

        const [url, init] = fetch.mock.calls[0];
        const headers = init!.headers as Record<string, string>;
        expect(url).toBe(WEBHOOK_URL);
        expect(init).toMatchObject({
            method: 'POST',
            body: JSON.stringify(DELIVERY)
        });

        expect(headers['content-type']).toBe('application/json');
        expectSigned(headers[SIGNATURE_HEADER], JSON.stringify(DELIVERY));
    });

    it('fails a delivery the receiver did not take so the queue retries it', async () => {
        fetch.mockResolvedValue(new Response('busy', { status: 503 }));

        await expect(queue.process(DELIVERY)).rejects.toThrow('Webhook::Refused:503');
    });
});
