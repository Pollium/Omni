import { OAuthProvider } from '../auth/domain';
import { DirectoryDayCount, DirectoryMethodCount } from '../directory/domain';
import { InstanceApp } from '../instance/domain';
import { TeamRole } from '../team/domain';
import { WebhookType } from '../webhooks/domain';

export type SignInMethod = OAuthProvider | 'password';

export type ConsoleUserView = 'all' | 'roles' | 'unverified' | 'week';

export interface ConsoleMember{
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
}

export interface ConsoleUser{
    id: string;
    fullName: string;
    username: string;
    email: string;
    avatarUrl: string | null;
    roles: string[];
    methods: SignInMethod[];
    verified: boolean;
    signupSource: string | null;
    createdAt: string;
}

export interface ConsoleUserPage{
    users: ConsoleUser[];
    total: number;
}

export type ConsoleUserCounts = Record<ConsoleUserView, number>;

export interface ConsoleUserTeam{
    id: string;
    name: string;
    role: TeamRole;
    members: number;
    joinedAt: string;
}

export interface ConsoleUserDetail extends ConsoleUser{
    bio: string;
    phone: string | null;
    signupCampaign: string | null;
    emailVerifiedAt: string | null;
    organizations: string[];
    teams: ConsoleUserTeam[];
}

export interface ConsoleOverview{
    total: number;
    verified: number;
    signups: DirectoryDayCount[];
    methods: DirectoryMethodCount[];
    pendingInvitations: number;
    expiredInvitations: number;
    recent: ConsoleUser[];
}

export interface ConsoleRole{
    name: string;
    count: number;
    holders: ConsoleUser[];
}

export interface ConsoleOrganization{
    id: string;
    name: string;
    members: number;
    teams: number;
    sharedTeams: number;
    pendingInvitations: number;
}

export interface ConsoleTeamOwner{
    id: string;
    fullName: string;
    avatarUrl: string | null;
}

export interface ConsoleTeam{
    id: string;
    name: string;
    members: number;
    owner: ConsoleTeamOwner | null;
    createdAt: string;
}

export interface ConsoleTeamPage{
    teams: ConsoleTeam[];
    total: number;
}

export interface ConsoleInvitation{
    id: string;
    email: string;
    team: string;
    expiresAt: string;
}

export type ConsoleDeliveryState = 'pending' | 'delivered' | 'retrying' | 'failed';

export interface ConsoleDelivery{
    id: string;
    type: WebhookType;
    state: ConsoleDeliveryState;
    attempts: number;
    error: string | null;
    occurredAt: string;
    finishedAt: string | null;
}

export interface ConsoleDeliveries{
    pending: number;
    failed: number;
    recent: ConsoleDelivery[];
}

export interface ConsoleApps{
    apps: InstanceApp[];
    webhookUrl: string;
    events: WebhookType[];
    membershipHookUrl: string;
    serviceKey: string;
    deliveries: ConsoleDeliveries;
}

export interface ConsoleProvider{
    name: OAuthProvider;
    clientId: string;
}

export interface ConsoleMailSettings{
    host: string;
    port: number;
    secure: boolean;
    from: string;
}

export interface ConsoleSettings{
    name: string;
    webUrl: string;
    apiUrl: string;
    defaultOrganization: string;
    invitationTtlHours: number;
    providers: ConsoleProvider[];
    mail: ConsoleMailSettings;
    termsUrl: string;
    privacyUrl: string;
}
