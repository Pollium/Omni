import { AuthErrorCode } from '@omni/contracts/auth/errors';
import { baseCodeOf, RateLimitErrorCode, RequestErrorCode } from '@omni/contracts/shared/errors';
import { i18n, MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';

const MESSAGES: Partial<Record<AuthErrorCode | RateLimitErrorCode | RequestErrorCode, MessageDescriptor>> = {
    'Auth::InvalidCredentials': msg`Wrong email or password.`,
    'Auth::EmailAlreadyRegistered': msg`This email is already registered.`,
    'Auth::UsernameAlreadyTaken': msg`That username is taken. Try another one.`,
    'RateLimit::TooManyRequests': msg`Too many attempts. Wait a minute and try again.`,
    'Request::ValidationFailed': msg`Review the form: some fields are missing or invalid.`
};

export const authErrorMessage = (fallback: MessageDescriptor) => (error: Error): string => {
    const keyed = MESSAGES[baseCodeOf(error.message) as AuthErrorCode];
    return i18n._(keyed ?? fallback);
};
