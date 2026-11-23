import Team from '../models/Team';
import TeamMembership from '../models/TeamMembership';
import TeamMembershipService from './TeamMembership';
import Webhooks from '@/modules/webhooks/services/Webhooks';
import { advisoryLock } from '@readable/utils/models/advisory-lock';
import { findOrThrow } from '@readable/utils/models/find-or-throw';
import { TeamProfile } from '@omni/contracts/team/domain';
import { CreateTeamInput, UpdateTeamInput } from '@omni/contracts/team/http';
import { TeamError } from '../contracts/domain/errors';
import { OrgTeamView, TeamWithRole } from '../contracts/domain/team';
import { orgContext } from '@/modules/organizations/services/OrgContext';
import { EntityManager } from 'typeorm';

const PERSONAL_TEAM_LOCK_NAMESPACE = 8320;

export default class TeamService{
    #memberships = new TeamMembershipService();
    #webhooks = new Webhooks();

    async listForUser(userId: string): Promise<TeamWithRole[]>{
        const memberships = await TeamMembership.find({
            where: { userId },
            relations: { team: true },
            order: { id: 'ASC' }
        });
        return memberships.map((membership) =>
            Object.assign(membership.team, { role: membership.role }));
    }

    async create(userId: string, input: CreateTeamInput): Promise<Team>{
        const orgId = await orgContext.of(userId);
        const team = await Team.getRepository().manager.transaction((manager) =>
            this.#provision(manager, orgId, userId, input));

        await this.#webhooks.publish('team.created', {
            teamId: team.id,
            orgId,
            createdBy: userId
        });
        return team;
    }

    async createPersonal(userId: string, fullName: string, username: string){
        const orgId = await orgContext.of(userId);
        const profile: TeamProfile = {
            name: `${fullName.trim() || username}'s Team`,
            description: ''
        };

        const team = await Team.getRepository().manager.transaction(async (manager) => {
            await advisoryLock(manager, PERSONAL_TEAM_LOCK_NAMESPACE, userId);
            if(await manager.existsBy(Team, { createdBy: userId })) return null;

            return this.#provision(manager, orgId, userId, profile);
        });
        if(team === null) return;

        await this.#webhooks.publish('team.created', {
            teamId: team.id,
            orgId,
            createdBy: userId
        });
    }

    async get(teamId: string): Promise<Team>{
        return findOrThrow(Team, { id: teamId }, TeamError.NotFound);
    }

    async update(teamId: string, patch: UpdateTeamInput): Promise<Team>{
        const team = await this.get(teamId);
        return Object.assign(team, patch).save();
    }

    async remove(userId: string, teamId: string){
        const team = await this.get(teamId);
        const remaining = await TeamMembership.countBy({ userId });
        if(remaining <= 1) throw TeamError.LastTeam();

        await team.remove();
        await this.#webhooks.publish('team.removed', { teamId });
    }

    async listForOrg(orgId: string): Promise<OrgTeamView[]>{
        const teams = await Team.find({ where: { orgId }, order: { id: 'ASC' } });
        if(teams.length === 0) return [];

        const rows = await TeamMembership.createQueryBuilder('membership')
            .select('membership.teamId', 'teamId')
            .addSelect('COUNT(*)', 'members')
            .where('membership.teamId IN (:...ids)', { ids: teams.map((team) => team.id) })
            .groupBy('membership.teamId')
            .getRawMany<{ teamId: string; members: string }>();

        const byTeam = new Map(rows.map((row) => [row.teamId, Number(row.members)]));

        return teams.map((team) => Object.assign(team, { memberCount: byTeam.get(team.id) ?? 0 }));
    }

    async #provision(manager: EntityManager, orgId: string, userId: string, profile: TeamProfile): Promise<Team>{
        const team = await manager.save(manager.create(Team, { ...profile, orgId, createdBy: userId }));
        await this.#memberships.provisionOwner(manager, team.id, userId);

        return team;
    }
}
