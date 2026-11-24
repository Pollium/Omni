import { OAuthProvider } from '../auth/domain';

export interface InstanceApp{
    id: string;
    url: string;
    /** @format uri */
    signUpUrl?: string;
}

export interface Instance{
    name: string;
    apps: InstanceApp[];
    console: InstanceApp;
    providers: OAuthProvider[];
    termsUrl: string;
    privacyUrl: string;
}
