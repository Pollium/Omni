import { defineErrors } from '@readable/utils/errors/define-errors';
import { WebhookErrors } from '@omni/contracts/webhooks/errors';

export const WebhookError = defineErrors(WebhookErrors);
