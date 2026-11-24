import Organization from '@/modules/organizations/models/Organization';
import DeliveryQueue from '@/modules/webhooks/queues/Delivery';
import { ConsoleApps, ConsoleDeliveries, ConsoleDelivery, ConsoleDeliveryState, ConsoleSettings } from '@omni/contracts/console/domain';
import { WebhookDelivery, WebhookType } from '@omni/contracts/webhooks/domain';
import { configuredProviders } from '@/modules/auth/providers/registry';
import { defaultOrganizationId } from '@/modules/organizations/services/DefaultOrganization';
import { config } from '@/shared/config';
import { Job } from 'bullmq';

const EVENTS: Record<WebhookType, true> = {
    'user.created': true,
    'user.removed': true,
    'user.activeOrg.changed': true,
    'organization.created': true,
    'team.created': true,
    'team.removed': true,
    'session.revoked': true
};

const SERVICE_KEY_PREVIEW = 4;

export default class ConsoleInstance{
    #deliveries = new DeliveryQueue();

    async apps(): Promise<ConsoleApps>{
        return {
            apps: [...config.apps],
            webhookUrl: config.webhooks.url,
            events: Object.keys(EVENTS) as WebhookType[],
            membershipHookUrl: config.webhooks.membershipUrl,
            serviceKey: config.serviceKey.slice(-SERVICE_KEY_PREVIEW),
            deliveries: await this.#recentDeliveries()
        };
    }

    async settings(): Promise<ConsoleSettings>{
        const organization = await Organization.findOneByOrFail({ id: await defaultOrganizationId() });

        return {
            name: config.name,
            webUrl: config.webUrl,
            apiUrl: config.apiUrl,
            defaultOrganization: organization.name,
            invitationTtlHours: config.invitation.ttlHours,
            providers: configuredProviders().map((name) => ({
                name,
                clientId: config.oauth[name].clientId
            })),
            mail: {
                host: config.smtp.host,
                port: config.smtp.port,
                secure: config.smtp.secure,
                from: config.smtp.from
            },
            termsUrl: config.termsUrl,
            privacyUrl: config.privacyUrl
        };
    }

    async #recentDeliveries(): Promise<ConsoleDeliveries>{
        const limit = config.console.deliveries;
        const [pending, failed, delivered, refused, queued] = await Promise.all([
            this.#deliveries.count('waiting', 'delayed', 'active'),
            this.#deliveries.count('failed'),
            this.#deliveries.jobs(['completed'], limit),
            this.#deliveries.jobs(['failed'], limit),
            this.#deliveries.jobs(['waiting', 'delayed', 'active'], limit)
        ]);
        const recent = [
            ...delivered.map((job) => this.#present(job, 'delivered')),
            ...refused.map((job) => this.#present(job, 'failed')),
            ...queued.map((job) => this.#present(job, job.attemptsMade > 0 ? 'retrying' : 'pending'))
        ];

        return {
            pending,
            failed,
            recent: recent
                .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
                .slice(0, limit)
        };
    }

    #present(job: Job<WebhookDelivery>, state: ConsoleDeliveryState): ConsoleDelivery{
        return {
            id: job.data.id,
            type: job.data.type,
            state,
            attempts: job.attemptsMade,
            error: state === 'delivered' || job.failedReason === '' ? null : job.failedReason ?? null,
            occurredAt: job.data.occurredAt,
            finishedAt: job.finishedOn === undefined ? null : new Date(job.finishedOn).toISOString()
        };
    }
}
