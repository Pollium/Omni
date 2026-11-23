import { ErrorCode, ErrorTable } from '../shared/errors';

export const UserErrors = {
    domain: 'User',
    causes: {
        InvalidPassword: 401,
        NotFound: 404,
        UsernameAlreadyTaken: 409,
        EmailAlreadyTaken: 409
    }
} as const satisfies ErrorTable;

export type UserErrorCode = ErrorCode<typeof UserErrors>;

export const AvatarErrors = {
    domain: 'Avatar',
    causes: {
        NotFound: 404,
        UnsupportedType: 415
    }
} as const satisfies ErrorTable;

export type AvatarErrorCode = ErrorCode<typeof AvatarErrors>;
