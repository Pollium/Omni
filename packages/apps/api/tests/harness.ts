import createApp from '@/core/Application';
import BaseQueue from '@readable/queues/BaseQueue';
import DeliveryQueue from '@/modules/webhooks/queues/Delivery';
import MailQueue from '@/modules/mail/queues/Mail';
import { ensureDefaultOrganization } from '@/modules/organizations/services/DefaultOrganization';
import { useApp as useSharedApp, TestApp } from '@readable/testing/harness';
import { rateLimitStore } from '@readable/testing/rate-limit';
import { authHeader } from '@readable/testing/request';
import { MailMessage } from '@/modules/mail/contracts/mail';
import { WebhookDelivery, WebhookEvents, WebhookType } from '@omni/contracts/webhooks/domain';
import { config } from '@/shared/config';
import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, expect, vi } from 'vitest';

export type { TestApp };

export const WEBHOOK_URL = 'https://hooks.example.test/omni';

export const MEMBERSHIP_HOOK_URL = 'https://hooks.example.test/membership';

export const SERVICE = { [config.serviceKeyHeader]: config.serviceKey };

export const useApp = (): TestApp => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    return useSharedApp({
        createApp,
        schema: config.database.schema,
        onBeforeEach: () => {
            vi.spyOn(rateLimitStore, 'incr').mockImplementation((_key, done) => done(null, { current: 1, ttl: 60_000 }));
        },
        onReset: async () => {
            await ensureDefaultOrganization();
        }
    });
};

const useWebhookSettings = (patch: Partial<typeof config.webhooks>) => {
    const previous = { ...config.webhooks };

    beforeEach(() => {
        Object.assign(config.webhooks, patch);
    });

    afterEach(() => {
        Object.assign(config.webhooks, previous);
    });
};

export const useWebhooks = () => useWebhookSettings({ url: WEBHOOK_URL });

export const useMembershipHook = () => useWebhookSettings({ membershipUrl: MEMBERSHIP_HOOK_URL });

export const enqueued = <T>(Queue: new () => BaseQueue<T>): T[] => {
    const add = vi.mocked(BaseQueue.prototype.add);

    return add.mock.calls.flatMap(([data], index) => add.mock.contexts[index] instanceof Queue ? [data as T] : []);
};

export const mails = (): MailMessage[] => enqueued(MailQueue);

export const deliveries = <K extends WebhookType>(type: K): WebhookEvents[K][] =>
    enqueued<WebhookDelivery>(DeliveryQueue).flatMap((delivery) => delivery.type === type ? [delivery.payload as WebhookEvents[K]] : []);

export const expectSigned = (header: string, body: string) => {
    const { t, v1 } = Object.fromEntries(header.split(',').map((part) => part.split('=')));
    const expected = createHmac('sha256', config.serviceKey)
        .update(`${t}.${body}`)
        .digest('hex');

    expect(v1).toBe(expected);
    expect(Math.abs(Date.now() / 1000 - Number(t))).toBeLessThan(5);
};

export { authHeader };
