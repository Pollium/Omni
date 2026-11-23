import { OAuthProvider } from '@omni/contracts/auth/domain';
import { CheckEmailInput, ExchangeCodeInput, ForgotPasswordInput, HandoffInput, ResetPasswordInput, SignInInput, SignUpInput } from '@omni/contracts/auth/http';
import { authRoutes } from '@omni/contracts/auth/routes';
import { InstanceApp } from '@omni/contracts/instance/domain';
import { instanceRoutes } from '@omni/contracts/instance/routes';
import { call } from '@omni/ui/api/call';
import { env } from '@omni/ui/config/env';

export const authApi = {
    instance: () => call(instanceRoutes.get),
    checkEmail: (query: CheckEmailInput) => call(authRoutes.checkEmail, { query }),
    signIn: (body: SignInInput) => call(authRoutes.signIn, { body }),
    signUp: (body: SignUpInput) => call(authRoutes.signUp, { body }),
    forgotPassword: (body: ForgotPasswordInput) => call(authRoutes.forgotPassword, { body }),
    resetPassword: (body: ResetPasswordInput) => call(authRoutes.resetPassword, { body }),
    oauthExchange: (body: ExchangeCodeInput) => call(authRoutes.oauthExchange, { body }),
    handoff: (body: HandoffInput) => call(authRoutes.handoff, { body }),
    oauthStartUrl: (provider: OAuthProvider, app: InstanceApp, challenge: string): string => {
        const params = new URLSearchParams({
            app: app.id,
            challenge
        });

        return `${env.apiUrl}${authRoutes.oauthStart.path.replace(':provider', provider)}?${params}`;
    }
};
