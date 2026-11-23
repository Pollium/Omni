import DeliveryQueue from '../queues/Delivery';
import { WebhookDelivery, WebhookEvents, WebhookType } from '@omni/contracts/webhooks/domain';
import { config } from '@/shared/config';
import { randomUUID } from 'node:crypto';

const deliveries = new DeliveryQueue();

export default class Webhooks{
    async publish<K extends WebhookType>(type: K, payload: WebhookEvents[K]){
        if(config.webhooks.url === '') return;

        const delivery = {
            id: randomUUID(),
            type,
            payload,
            occurredAt: new Date().toISOString()
        } as WebhookDelivery;

        await deliveries.add(delivery, { jobId: delivery.id });
    }
}
