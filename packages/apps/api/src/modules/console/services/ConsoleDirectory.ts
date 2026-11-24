import Invitation from '@/modules/invitations/models/Invitation';
import Organization from '@/modules/organizations/models/Organization';
import OrganizationMembership from '@/modules/organizations/models/OrganizationMembership';
import Team from '@/modules/teams/models/Team';
import TeamMembership from '@/modules/teams/models/TeamMembership';
import User from '@/modules/user/models/User';
import ConsoleUsers from './ConsoleUsers';
import { Page } from '@readable/contracts/params';
import { tableRef } from '@readable/utils/models/table-ref';
import { ConsoleInvitation, ConsoleOrganization, ConsoleRole, ConsoleTeamPage } from '@omni/contracts/console/domain';
import { InvitationStatus } from '@omni/contracts/invitation/domain';
import { defaultOrganizationId } from '@/modules/organizations/services/DefaultOrganization';
import { config } from '@/shared/config';
import { ArrayContains, In } from 'typeorm';

interface RoleRow{
    role: string;
    total: string;
}

interface TeamRow{
    id: string;
    name: string;
    createdAt: Date;
    members: string;
    ownerId: string | null;
    ownerName: string | null;
    ownerAvatar: string | null;
}

interface SharedRow{
    shared: string;
}

export default class ConsoleDirectory{
    #users = new ConsoleUsers();

    async roles(): Promise<ConsoleRole[]>{
        const manager = User.getRepository().manager;
        const users = tableRef(manager, User);
        const rows = await manager.query<RoleRow[]>(`
            SELECT role, COUNT(*) AS total
            FROM ${users.table}, unnest("roles") AS role
            GROUP BY role
        `);
        const ranked = rows.sort((a, b) => Number(b.role === config.console.role) - Number(a.role === config.console.role) || a.role.localeCompare(b.role));

        return Promise.all(ranked.map(async (row) => ({
            name: row.role,
            count: Number(row.total),
            opensConsole: row.role === config.console.role,
            holders: await this.#users.present(await User.find({
                where: { roles: ArrayContains([row.role]) },
                order: { createdAt: 'ASC' },
                take: config.console.roleHolders
            }))
        })));
    }

    async organization(): Promise<ConsoleOrganization>{
        const orgId = await defaultOrganizationId();
        const [organization, members, teams, shared, pendingInvitations] = await Promise.all([
            Organization.findOneByOrFail({ id: orgId }),
            OrganizationMembership.countBy({ orgId }),
            Team.countBy({ orgId }),
            this.#sharedTeams(orgId),
            Invitation.countBy({ orgId, status: InvitationStatus.Pending })
        ]);

        return {
            id: organization.id,
            name: organization.name,
            members,
            teams,
            sharedTeams: shared,
            pendingInvitations
        };
    }

    async teams(page: Page): Promise<ConsoleTeamPage>{
        const orgId = await defaultOrganizationId();
        const [rows, total] = await Promise.all([
            Team.createQueryBuilder('team')
                .leftJoin(TeamMembership, 'membership', 'membership.teamId = team.id')
                .leftJoin(User, 'owner', 'owner.id = team.createdBy')
                .select('team.id', 'id')
                .addSelect('team.name', 'name')
                .addSelect('team.createdAt', 'createdAt')
                .addSelect('COUNT(membership.id)', 'members')
                .addSelect('owner.id', 'ownerId')
                .addSelect('owner.fullName', 'ownerName')
                .addSelect('owner.avatarUrl', 'ownerAvatar')
                .where('team.orgId = :orgId', { orgId })
                .groupBy('team.id')
                .addGroupBy('owner.id')
                .orderBy('COUNT(membership.id)', 'DESC')
                .addOrderBy('team.name', 'ASC')
                .addOrderBy('team.id', 'ASC')
                .offset(page.offset)
                .limit(page.limit)
                .getRawMany<TeamRow>(),
            Team.countBy({ orgId })
        ]);

        return {
            teams: rows.map((row) => ({
                id: row.id,
                name: row.name,
                members: Number(row.members),
                owner: row.ownerId === null ? null : {
                    id: row.ownerId,
                    fullName: row.ownerName ?? '',
                    avatarUrl: row.ownerAvatar
                },
                createdAt: new Date(row.createdAt).toISOString()
            })),
            total
        };
    }

    async invitations(): Promise<ConsoleInvitation[]>{
        const invitations = await Invitation.find({
            where: { status: InvitationStatus.Pending },
            order: { expiresAt: 'ASC' },
            take: config.console.invitations
        });
        const teams = invitations.length === 0 ? [] : await Team.findBy({ id: In(invitations.map((invitation) => invitation.teamId)) });
        const names = new Map(teams.map((team) => [team.id, team.name]));

        return invitations.map((invitation) => ({
            id: invitation.id,
            email: invitation.email,
            team: names.get(invitation.teamId) ?? '',
            expiresAt: invitation.expiresAt.toISOString()
        }));
    }

    async #sharedTeams(orgId: string): Promise<number>{
        const row = await Team.createQueryBuilder('team')
            .select('COUNT(*)', 'shared')
            .where('team.orgId = :orgId', { orgId })
            .andWhere((outer) => `(${outer.subQuery()
                .select('COUNT(*)')
                .from(TeamMembership, 'membership')
                .where('membership.teamId = team.id')
                .getQuery()}) > 1`)
            .getRawOne<SharedRow>();

        return Number(row?.shared ?? 0);
    }
}
