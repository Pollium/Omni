import { ErrorCode, ErrorTable } from '../shared/errors';

export const WebhookErrors = {
    domain: 'Webhook',
    causes: {
        Refused: 502,
        MembershipHookFailed: 502
    }
} as const satisfies ErrorTable;

export type WebhookErrorCode = ErrorCode<typeof WebhookErrors>;
