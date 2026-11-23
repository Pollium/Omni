import { get, post } from '../shared/routing';
import { AuthSession, EmailAvailability } from './domain';
import { SignInInput, SignUpInput, ForgotPasswordInput, ResetPasswordInput, ExchangeCodeInput, HandoffInput } from './http';

export const authRoutes = {
    checkEmail: get<EmailAvailability>('/auth/email-availability'),
    signIn: post<SignInInput, AuthSession>('/auth/sign-in'),
    signUp: post<SignUpInput, AuthSession>('/auth/sign-up'),
    forgotPassword: post<ForgotPasswordInput>('/auth/forgot-password'),
    resetPassword: post<ResetPasswordInput, AuthSession>('/auth/reset-password'),
    oauthStart: get<void>('/auth/oauth/:provider'),
    oauthCallback: get<void>('/auth/oauth/:provider/callback'),
    oauthExchange: post<ExchangeCodeInput, AuthSession>('/auth/oauth/exchange'),
    handoff: post<HandoffInput, { code: string }>('/auth/handoff')
};
