import Team from '@/modules/teams/models/Team';
import TeamMembership from '@/modules/teams/models/TeamMembership';
import User from '@/modules/user/models/User';
import UserDirectory from '@/modules/user/services/UserDirectory';
import OrganizationMembership from '../models/OrganizationMembership';
import Webhooks from '@/modules/webhooks/services/Webhooks';
import { findOrThrow } from '@readable/utils/models/find-or-throw';
import { OrganizationRole, OrganizationMember } from '@omni/contracts/organization/domain';
import { TeamRole } from '@omni/contracts/team/domain';
import { AddMemberInput, UpdateMemberRoleInput } from '@omni/contracts/organization/http';
import { OrganizationError } from '../contracts/domain/errors';
import { defaultOrganizationId } from './DefaultOrganization';
import { forgetOrgContext } from './OrgContext';
import { In, Not } from 'typeorm';

export default class MembershipService{
    #users = new UserDirectory();
    #webhooks = new Webhooks();

    async roster(orgId: string): Promise<OrganizationMember[]>{
        if(orgId === await defaultOrganizationId()) throw OrganizationError.Forbidden();

        return this.list(orgId);
    }

    async list(orgId: string): Promise<OrganizationMember[]>{
        const memberships = await OrganizationMembership.find({ where: { orgId }, order: { id: 'ASC' } });
        const people = await this.#users.summariesById(memberships.map((membership) => membership.userId));

        return memberships.flatMap((membership) => {
            const person = people.get(membership.userId);
            if(person === undefined) return [];

            return [{
                ...person,
                membershipId: membership.id,
                role: membership.role,
                joinedAt: membership.createdAt.toISOString()
            }];
        });
    }

    async add(orgId: string, input: AddMemberInput): Promise<OrganizationMembership>{
        await findOrThrow(User, { id: input.userId }, OrganizationError.UserNotFound);

        return this.enroll(orgId, input.userId, input.role ?? OrganizationRole.Member);
    }

    async enroll(orgId: string, userId: string, role: OrganizationRole): Promise<OrganizationMembership>{
        const existing = await OrganizationMembership.findOneBy({ orgId, userId });
        if(existing) throw OrganizationError.AlreadyAMember();

        return OrganizationMembership.create({ orgId, userId, role }).save();
    }

    async enrollDefault(userId: string): Promise<OrganizationMembership>{
        const orgId = await defaultOrganizationId();
        const existing = await OrganizationMembership.findOneBy({ orgId, userId });
        if(existing !== null) return existing;

        return OrganizationMembership.create({ orgId, userId, role: OrganizationRole.Member }).save();
    }

    async updateRole(orgId: string, userId: string, input: UpdateMemberRoleInput): Promise<OrganizationMembership>{
        const membership = await this.get(orgId, userId);

        if(membership.role === OrganizationRole.Admin && input.role !== OrganizationRole.Admin){
            await this.#assertNotLastAdmin(orgId);
        }

        membership.role = input.role;
        return membership.save();
    }

    async remove(orgId: string, userId: string){
        const membership = await this.get(orgId, userId);

        if(membership.role === OrganizationRole.Admin){
            await this.#assertNotLastAdmin(orgId);
        }

        await membership.remove();
        await this.#leaveTeamsOf(orgId, userId);
        await User.getRepository().update({ id: userId, activeOrgId: orgId }, { activeOrgId: null });
        forgetOrgContext(userId);
        await this.#webhooks.publish('user.activeOrg.changed', {
            userId,
            orgId
        });
    }

    provisionAdmin(orgId: string, userId: string): Promise<OrganizationMembership>{
        return OrganizationMembership.create({ orgId, userId, role: OrganizationRole.Admin }).save();
    }

    async get(orgId: string, userId: string): Promise<OrganizationMembership>{
        const membership = await findOrThrow(OrganizationMembership, { orgId, userId }, OrganizationError.MemberNotFound);
        return membership;
    }

    async assertMember(orgId: string, userId: string){
        await findOrThrow(OrganizationMembership, { orgId, userId }, OrganizationError.NotAMember);
    }

    async isMember(orgId: string, userId: string): Promise<boolean>{
        return await OrganizationMembership.findOneBy({ orgId, userId }) !== null;
    }

    async #leaveTeamsOf(orgId: string, userId: string){
        const teams = await Team.findBy({ orgId });
        if(teams.length === 0) return;

        await TeamMembership.delete({ userId, teamId: In(teams.map((team) => team.id)), role: Not(TeamRole.Owner) });
    }

    async #assertNotLastAdmin(orgId: string){
        const admins = await OrganizationMembership.countBy({ orgId, role: OrganizationRole.Admin });
        if(admins <= 1) throw OrganizationError.LastAdmin();
    }
}
