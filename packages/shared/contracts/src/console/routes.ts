import { del, get, post, put } from '../shared/routing';
import { ConsoleApps, ConsoleInvitation, ConsoleMember, ConsoleOrganization, ConsoleOverview, ConsoleRole, ConsoleSettings, ConsoleTeamPage, ConsoleUserCounts, ConsoleUserDetail, ConsoleUserPage } from './domain';
import { ConsolePasswordResetInput } from './http';

export const consoleRoutes = {
    me: get<ConsoleMember>('/console/me'),
    overview: get<ConsoleOverview>('/console/overview'),
    users: get<ConsoleUserPage>('/console/users'),
    userCounts: get<ConsoleUserCounts>('/console/users/counts'),
    user: get<ConsoleUserDetail>('/console/users/:userId'),
    grantRole: put<never, ConsoleUserDetail>('/console/users/:userId/roles/:role'),
    revokeRole: del<ConsoleUserDetail>('/console/users/:userId/roles/:role'),
    sendPasswordReset: post<ConsolePasswordResetInput>('/console/users/:userId/password-reset'),
    revokeSessions: post<never>('/console/users/:userId/sessions/revoke'),
    removeUser: del('/console/users/:userId'),
    roles: get<ConsoleRole[]>('/console/roles'),
    organization: get<ConsoleOrganization>('/console/organization'),
    teams: get<ConsoleTeamPage>('/console/teams'),
    invitations: get<ConsoleInvitation[]>('/console/invitations'),
    apps: get<ConsoleApps>('/console/apps'),
    settings: get<ConsoleSettings>('/console/settings')
};
