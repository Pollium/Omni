import { BaseEntity } from '../shared/base';
import { TeamRole } from '../team/domain';

export enum InvitationStatus{
    Pending = 'pending',
    Accepted = 'accepted',
    Revoked = 'revoked'
}

export interface Invitation extends BaseEntity{
    orgId: string;
    teamId: string;
    email: string;
    teamRole: TeamRole;
    status: InvitationStatus;
    invitedBy: string | null;
    expiresAt: string;
}

export interface InvitationPreview{
    teamName: string;
    orgName: string;
    invitedByName: string | null;
    email: string;
    expiresAt: string;
}

export interface AcceptedInvitation{
    teamId: string;
    orgId: string;
    role: TeamRole;
}
