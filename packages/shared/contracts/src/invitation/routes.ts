import { get, post, del } from '../shared/routing';
import { AcceptedInvitation, Invitation, InvitationPreview } from './domain';
import { CreateInvitationInput } from './http';

export const invitationRoutes = {
    listForTeam: get<Invitation[]>('/invitations'),
    create: post<CreateInvitationInput, Invitation>('/invitations'),
    preview: get<InvitationPreview>('/invitations/:token'),
    accept: post<never, AcceptedInvitation>('/invitations/:token/accept'),
    revoke: del('/invitations/:invitationId')
};
