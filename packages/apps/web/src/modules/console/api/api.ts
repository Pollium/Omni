import { ConsoleTeamsQuery, ConsoleUsersQuery } from '@omni/contracts/console/http';
import { consoleRoutes } from '@omni/contracts/console/routes';
import { Language } from '@omni/contracts/shared/language';
import { call } from '@omni/ui/api/call';

const present = (query: object): Record<string, unknown> =>
    Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== ''));

export const consoleApi = {
    me: () => call(consoleRoutes.me),
    overview: (days: number) => call(consoleRoutes.overview, { query: { days } }),
    users: (query: ConsoleUsersQuery) => call(consoleRoutes.users, { query: present(query) }),
    userCounts: () => call(consoleRoutes.userCounts),
    user: (userId: string) => call(consoleRoutes.user, { params: { userId } }),
    grantRole: (userId: string, role: string) => call(consoleRoutes.grantRole, { params: { userId, role } }),
    revokeRole: (userId: string, role: string) => call(consoleRoutes.revokeRole, { params: { userId, role } }),
    sendPasswordReset: (userId: string, language: Language) => call(consoleRoutes.sendPasswordReset, { params: { userId }, body: { language } }),
    revokeSessions: (userId: string) => call(consoleRoutes.revokeSessions, { params: { userId } }),
    removeUser: (userId: string) => call(consoleRoutes.removeUser, { params: { userId } }),
    roles: () => call(consoleRoutes.roles),
    organization: () => call(consoleRoutes.organization),
    teams: (query: ConsoleTeamsQuery) => call(consoleRoutes.teams, { query: present(query) }),
    invitations: () => call(consoleRoutes.invitations),
    apps: () => call(consoleRoutes.apps),
    settings: () => call(consoleRoutes.settings)
};
