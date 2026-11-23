import { ErrorCode, ErrorTable } from '../shared/errors';

export const TeamErrors = {
    domain: 'Team',
    causes: {
        NotFound: 404,
        Forbidden: 403,
        NotAMember: 403,
        MemberNotFound: 404,
        AlreadyAMember: 409,
        LastOwner: 409,
        LastTeam: 409
    }
} as const satisfies ErrorTable;

export type TeamErrorCode = ErrorCode<typeof TeamErrors>;
