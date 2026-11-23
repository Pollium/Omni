import { ErrorCode, ErrorTable } from '../shared/errors';

export const AuthErrors = {
    domain: 'Auth',
    causes: {
        Unauthorized: 401,
        InvalidToken: 401,
        InvalidCredentials: 401,
        EmailAlreadyRegistered: 409,
        UsernameAlreadyTaken: 409,
        InvalidResetToken: 400
    }
} as const satisfies ErrorTable;

export type AuthErrorCode = ErrorCode<typeof AuthErrors>;

export const OAuthErrors = {
    domain: 'OAuth',
    causes: {
        UnknownProvider: 404,
        NotConfigured: 404,
        StateMismatch: 401,
        ExchangeFailed: 502,
        EmailNotProvided: 422,
        EmailNotVerified: 403,
        EmailNotProven: 409,
        InvalidHandoffCode: 401,
        InvalidHandoffChallenge: 400
    }
} as const satisfies ErrorTable;

export type OAuthErrorCode = ErrorCode<typeof OAuthErrors>;
