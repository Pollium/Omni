import { ErrorCode, ErrorTable } from '../shared/errors';

export const OrganizationErrors = {
    domain: 'Organization',
    causes: {
        NotFound: 404,
        Forbidden: 403,
        NotAMember: 403,
        MemberNotFound: 404,
        UserNotFound: 404,
        AlreadyAMember: 409,
        LastAdmin: 409,
        DefaultOrganization: 409
    }
} as const satisfies ErrorTable;

export type OrganizationErrorCode = ErrorCode<typeof OrganizationErrors>;
