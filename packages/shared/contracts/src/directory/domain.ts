import { OAuthProvider } from '../auth/domain';

export interface DirectoryUser{
    id: string;
    fullName: string;
    username: string;
    email: string;
    bio: string;
    avatarUrl: string | null;
    roles: string[];
    activeOrgId: string | null;
    createdAt: string;
    signupSource: string | null;
    signupCampaign: string | null;
    hasPassword: boolean;
}

export interface DirectoryAccount{
    phone: string | null;
    emailVerifiedAt: string | null;
    providers: OAuthProvider[];
}

export interface DirectoryDayCount{
    date: string;
    count: number;
}

export interface DirectoryMethodCount{
    method: string;
    count: number;
}

export interface DirectorySourceCount{
    source: string;
    campaign: string | null;
    count: number;
}

export interface DirectoryCensus{
    total: number;
    signups: DirectoryDayCount[];
    methods: DirectoryMethodCount[];
    sources: DirectorySourceCount[];
}
