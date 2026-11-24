import { AuthSession } from '@omni/contracts/auth/domain';
import { Instance, InstanceApp } from '@omni/contracts/instance/domain';
import { useSessionStore } from '@omni/ui/store/session';
import { AuthFlow } from '@/modules/auth/contracts/auth';

export const appOf = (instance: Instance, id: string | null): InstanceApp =>
    [...instance.apps, instance.console].find((app) => app.id === id) ?? instance.apps[0];

export const authHref = (path: string, { app, next }: Pick<AuthFlow, 'app' | 'next'>, email?: string): string => {
    const params = new URLSearchParams({ app: app.id });
    if(next) params.set('next', next);
    if(email) params.set('email', email);
    return `${path}?${params}`;
};

export const appSignUpUrl = (signUpUrl: string, next: string | null, email: string): string => {
    const url = new URL(signUpUrl);
    if(email) url.searchParams.set('email', email);
    if(next) url.searchParams.set('next', next);
    return url.toString();
};

export const appCallbackUrl = (app: InstanceApp, params: Record<string, string>): string => {
    const url = new URL(`${app.url}/auth/callback`);
    for(const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    return url.toString();
};

export const finishAuth = (session: AuthSession, app: InstanceApp, next: string | null) => {
    useSessionStore.getState().setToken(session.token);
    window.location.replace(appCallbackUrl(app, next ? { next } : {}));
};
