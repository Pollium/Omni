import { defineErrors } from '@readable/utils/errors/define-errors';
import { AuthErrors, OAuthErrors } from '@omni/contracts/auth/errors';

export const AuthError = defineErrors(AuthErrors);
export const OAuthError = defineErrors(OAuthErrors);
