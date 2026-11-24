import Signature from '../services/Signature';
import BaseQueue from '@readable/queues/BaseQueue';
import { SIGNATURE_HEADER, WebhookDelivery } from '@omni/contracts/webhooks/domain';
import { WebhookError } from '../contracts/domain/errors';
import { config } from '@/shared/config';
import { JobsOptions } from 'bullmq';

export default class DeliveryQueue extends BaseQueue<WebhookDelivery>{
    readonly name = 'webhook-delivery';
    #signature = new Signature();

    protected readonly jobOptions: JobsOptions = {
        attempts: config.webhooks.attempts,
        backoff: {
            type: 'exponential',
            delay: config.webhooks.backoffMs
        },
        removeOnComplete: { count: config.webhooks.keepDelivered }
    };

    async process(delivery: WebhookDelivery){
        const body = JSON.stringify(delivery);
        const response = await fetch(config.webhooks.url, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                [SIGNATURE_HEADER]: this.#signature.header(body)
            },
            body,
            signal: AbortSignal.timeout(config.webhooks.timeoutMs)
        });

        if(!response.ok) throw WebhookError.Refused(String(response.status));
    }
}
