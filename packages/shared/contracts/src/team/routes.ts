import { get, post, patch, del } from '../shared/routing';
import { Team, TeamWithRole, TeamMember, TeamMembership } from './domain';
import { CreateTeamInput, UpdateTeamInput, UpdateTeamMemberRoleInput } from './http';

export const teamRoutes = {
    mine: get<TeamWithRole[]>('/teams'),
    create: post<CreateTeamInput, Team>('/teams'),
    get: get<Team>('/teams/:teamId'),
    update: patch<UpdateTeamInput, Team>('/teams/:teamId'),
    remove: del('/teams/:teamId'),
    listMembers: get<TeamMember[]>('/teams/:teamId/members'),
    updateMemberRole: patch<UpdateTeamMemberRoleInput, TeamMembership>('/teams/:teamId/members/:userId'),
    removeMember: del('/teams/:teamId/members/:userId')
};
