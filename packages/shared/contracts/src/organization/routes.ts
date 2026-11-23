import { get, post, patch, del } from '../shared/routing';
import { OrgTeam } from '../team/domain';
import { Organization, OrganizationWithRole, Membership, OrganizationMember } from './domain';
import { CreateOrganizationInput, UpdateOrganizationInput, AddMemberInput, UpdateMemberRoleInput } from './http';

export const organizationRoutes = {
    mine: get<OrganizationWithRole[]>('/organizations'),
    create: post<CreateOrganizationInput, Organization>('/organizations'),
    get: get<Organization>('/organizations/:orgId'),
    update: patch<UpdateOrganizationInput, Organization>('/organizations/:orgId'),
    remove: del('/organizations/:orgId'),
    listMembers: get<OrganizationMember[]>('/organizations/:orgId/members'),
    addMember: post<AddMemberInput, Membership>('/organizations/:orgId/members'),
    updateMemberRole: patch<UpdateMemberRoleInput, Membership>('/organizations/:orgId/members/:userId'),
    removeMember: del('/organizations/:orgId/members/:userId'),
    listTeams: get<OrgTeam[]>('/organizations/:orgId/teams')
};
