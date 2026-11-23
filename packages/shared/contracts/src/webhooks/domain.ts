export const SIGNATURE_HEADER = 'omni-signature';

export interface UserCreatedPayload{
    userId: string;
    fullName: string;
    username: string;
}

export interface UserRemovedPayload{
    userId: string;
}

export interface ActiveOrgChangedPayload{
    userId: string;
    orgId: string;
}

export interface OrganizationCreatedPayload{
    orgId: string;
    createdBy: string | null;
}

export interface TeamCreatedPayload{
    teamId: string;
    orgId: string;
    createdBy: string;
}

export interface TeamRemovedPayload{
    teamId: string;
}

export interface SessionRevokedPayload{
    userId: string;
    cutoff: number;
}

export interface WebhookEvents{
    'user.created': UserCreatedPayload;
    'user.removed': UserRemovedPayload;
    'user.activeOrg.changed': ActiveOrgChangedPayload;
    'organization.created': OrganizationCreatedPayload;
    'team.created': TeamCreatedPayload;
    'team.removed': TeamRemovedPayload;
    'session.revoked': SessionRevokedPayload;
}

export type WebhookType = keyof WebhookEvents;

export type WebhookDelivery = {
    [K in WebhookType]: {
        id: string;
        type: K;
        payload: WebhookEvents[K];
        occurredAt: string;
    };
}[WebhookType];

export interface MembershipRequest{
    orgId: string;
    email: string;
}

export interface MembershipVerdict{
    allowed: boolean;
}
