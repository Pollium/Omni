import { del, get, post, put } from '../shared/routing';
import { Organization, OrganizationMember } from '../organization/domain';
import { Team, TeamMember, TeamWithRole } from '../team/domain';
import { PublicUserSummary } from '../user/domain';
import { DirectoryAccount, DirectoryCensus, DirectoryUser } from './domain';
import { DirectorySummariesInput } from './http';

export const directoryRoutes = {
    defaultOrg: get<{ orgId: string }>('/directory/organizations/default'),
    organizations: get<Organization[]>('/directory/organizations'),
    organization: get<Organization>('/directory/organizations/:orgId'),
    orgMembers: get<OrganizationMember[]>('/directory/organizations/:orgId/members'),
    user: get<DirectoryUser>('/directory/users/:userId'),
    users: get<DirectoryUser[]>('/directory/users'),
    searchUsers: get<DirectoryUser[]>('/directory/users/search'),
    removeUser: del('/directory/users/:userId'),
    userAccount: get<DirectoryAccount>('/directory/users/:userId/account'),
    userByUsername: get<DirectoryUser>('/directory/users/by-username/:username'),
    userSummaries: post<DirectorySummariesInput, PublicUserSummary[]>('/directory/users/summaries'),
    userCensus: get<DirectoryCensus>('/directory/users/census'),
    usersWithRole: get<DirectoryUser[]>('/directory/roles/:role/users'),
    grantRole: put<never, DirectoryUser>('/directory/users/:userId/roles/:role'),
    revokeRole: del<DirectoryUser>('/directory/users/:userId/roles/:role'),
    team: get<Team>('/directory/teams/:teamId'),
    teamMembers: get<TeamMember[]>('/directory/teams/:teamId/members'),
    userTeams: get<TeamWithRole[]>('/directory/users/:userId/teams')
};
