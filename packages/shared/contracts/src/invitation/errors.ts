import { ErrorCode, ErrorTable } from '../shared/errors';

export const InvitationErrors = {
    domain: 'Invitation',
    causes: {
        NotFound: 404,
        Expired: 410,
        AlreadyAccepted: 409,
        Revoked: 410,
        EmailMismatch: 403,
        AlreadyAMember: 409,
        SeatsExhausted: 409,
        AlreadyInvited: 409
    }
} as const satisfies ErrorTable;

export type InvitationErrorCode = ErrorCode<typeof InvitationErrors>;
