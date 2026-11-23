import UserDirectory from '@/modules/user/services/UserDirectory';
import TeamMembership from '../models/TeamMembership';
import { findOrThrow } from '@readable/utils/models/find-or-throw';
import { TeamRole, TeamMember } from '@omni/contracts/team/domain';
import { UpdateTeamMemberRoleInput } from '@omni/contracts/team/http';
import { TeamError } from '../contracts/domain/errors';
import { EntityManager } from 'typeorm';

const ADMIN_ROLES: TeamRole[] = [TeamRole.Owner, TeamRole.Admin];

export default class TeamMembershipService{
    #users = new UserDirectory();

    async list(teamId: string): Promise<TeamMember[]>{
        const memberships = await TeamMembership.find({ where: { teamId }, order: { id: 'ASC' } });
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

    async updateRole(teamId: string, userId: string, input: UpdateTeamMemberRoleInput): Promise<TeamMembership>{
        const membership = await this.get(teamId, userId);
        if(membership.role === TeamRole.Owner) throw TeamError.LastOwner();

        membership.role = input.role;
        return membership.save();
    }

    async remove(teamId: string, userId: string){
        const membership = await this.get(teamId, userId);
        if(membership.role === TeamRole.Owner) throw TeamError.LastOwner();

        await membership.remove();
    }

    provisionOwner(manager: EntityManager, teamId: string, userId: string): Promise<TeamMembership>{
        return manager.save(manager.create(TeamMembership, { teamId, userId, role: TeamRole.Owner }));
    }

    async join(teamId: string, userId: string, role: TeamRole): Promise<TeamMembership>{
        const existing = await TeamMembership.findOneBy({ teamId, userId });
        if(existing !== null) throw TeamError.AlreadyAMember();

        return TeamMembership.create({ teamId, userId, role }).save();
    }

    async get(teamId: string, userId: string): Promise<TeamMembership>{
        return findOrThrow(TeamMembership, { teamId, userId }, TeamError.MemberNotFound);
    }

    async assertMember(teamId: string, userId: string){
        await findOrThrow(TeamMembership, { teamId, userId }, TeamError.NotAMember);
    }

    async isMember(teamId: string, userId: string): Promise<boolean>{
        return await TeamMembership.findOneBy({ teamId, userId }) !== null;
    }

    async assertAdmin(teamId: string, userId: string){
        const membership = await findOrThrow(TeamMembership, { teamId, userId }, TeamError.NotAMember);
        if(!ADMIN_ROLES.includes(membership.role)) throw TeamError.Forbidden();
    }
}
