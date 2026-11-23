import { OAuthProvider } from '../auth/domain';

export interface InstanceApp{
    id: string;
    url: string;
}

export interface Instance{
    name: string;
    apps: InstanceApp[];
    providers: OAuthProvider[];
    termsUrl: string;
    privacyUrl: string;
}
