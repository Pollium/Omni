export enum OAuthProviderName{
    Google = 'google',
    Microsoft = 'microsoft',
    GitHub = 'github'
}

export interface OAuthProfile{
    provider: OAuthProviderName;
    providerAccountId: string;
    email: string;
    emailVerified: boolean;
    name: string;
    avatarUrl: string | null;
}

export interface OAuthStartResult{
    url: string;
}

export interface OAuthStateIssue{
    state: string;
    codeVerifier: string;
}

export interface OAuthStateRecord{
    codeVerifier: string;
    handoffChallenge: string;
    app: string;
    source: string | null;
    campaign: string | null;
}

export interface OAuthAttribution{
    source: string | null;
    campaign: string | null;
}

export interface OAuthHandoff{
    code: string;
    app: string;
}

export interface OidcIdTokenClaims{
    sub: string;
    email?: string;
    email_verified?: boolean | string;
    name?: string;
    picture?: string;
}

export interface MicrosoftIdTokenClaims extends OidcIdTokenClaims{
    xms_edov?: boolean | string;
}

export interface GitHubProfile{
    id: string;
    login: string;
    name: string | null;
    email: string | null;
    avatar_url: string;
}

export interface GitHubEmail{
    email: string;
    primary: boolean;
    verified: boolean;
}
