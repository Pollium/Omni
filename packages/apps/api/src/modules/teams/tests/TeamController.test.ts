import Team from '../models/Team';
import TeamMembership from '../models/TeamMembership';
import User from '@/modules/user/models/User';
import { teamRoutes } from '@omni/contracts/team/routes';
import { TeamRole } from '@omni/contracts/team/domain';
import { organizationSeed } from '@/modules/organizations/tests/OrganizationSeed';
import { defaultOrganizationId } from '@/modules/organizations/services/DefaultOrganization';
import { teamSeed } from './TeamSeed';
import { userSeed } from '@/modules/user/tests/UserSeed';
import { deliveries, useApp, useWebhooks } from '@tests/harness';
import { request, expectError } from '@tests/request';
import { describe, expect, it } from 'vitest';

const PROFILE = {
    name: 'Research',
    description: 'Lab work'
};

describe('TeamController', () => {
    const ctx = useApp();

    const withMember = async (role: TeamRole) => {
        const seed = await teamSeed.ownedTeam();
        const member = await userSeed.user();
        await teamSeed.join(seed.team.id, member, role);

        return { ...seed, member };
    };

    it('rejects unauthenticated requests', async () => {
        const res = await request(ctx.app, teamRoutes.mine);

        expectError(res, 401, 'Auth::Unauthorized');
    });

    it('lists the caller teams with their role', async () => {
        const seed = await teamSeed.ownedTeam();

        const res = await request(ctx.app, teamRoutes.mine, { as: seed.user.id });

        expect(res.status).toBe(200);
        expect(res.data()).toEqual([expect.objectContaining({
            id: seed.team.id,
            name: seed.team.name,
            orgId: seed.organization.id,
            role: TeamRole.Owner
        })]);
    });

    it('does not list another user teams', async () => {
        await teamSeed.ownedTeam();
        const stranger = await userSeed.user();

        const res = await request(ctx.app, teamRoutes.mine, { as: stranger.id });

        expect(res.status).toBe(200);
        expect(res.data()).toEqual([]);
    });

    it('creates a team in the active organization, owned by its creator', async () => {
        const { user, organization } = await organizationSeed.memberOf();
        await User.update({ id: user.id }, { activeOrgId: organization.id });

        const res = await request(ctx.app, teamRoutes.create, { as: user.id, body: PROFILE });

        expect(res.status).toBe(201);
        expect(res.data()).toMatchObject({
            ...PROFILE,
            orgId: organization.id,
            createdBy: user.id
        });

        expect(await TeamMembership.findOneBy({ teamId: res.data().id, userId: user.id })).toMatchObject({ role: TeamRole.Owner });
    });

    it('creates a team in the default organization for a caller with none active', async () => {
        const user = await userSeed.user();

        const res = await request(ctx.app, teamRoutes.create, { as: user.id, body: PROFILE });

        expect(res.data().orgId).toBe(await defaultOrganizationId());
    });

    it('shows a team and its members only to its members', async () => {
        const { team, user, member } = await withMember(TeamRole.Member);
        const stranger = await userSeed.user();
        const params = { teamId: team.id };

        expect((await request(ctx.app, teamRoutes.get, { as: member.id, params })).data().id).toBe(team.id);
        const members = await request(ctx.app, teamRoutes.listMembers, { as: member.id, params });
        expect(members.data().map((entry) => [entry.userId, entry.role])).toEqual([[user.id, TeamRole.Owner], [member.id, TeamRole.Member]]);
        expectError(await request(ctx.app, teamRoutes.get, { as: stranger.id, params }), 403, 'Team::NotAMember');
        expectError(await request(ctx.app, teamRoutes.listMembers, { as: stranger.id, params }), 403, 'Team::NotAMember');
    });

    it('lets owners and admins edit a team, but not plain members', async () => {
        const { team, user, member } = await withMember(TeamRole.Member);
        const admin = await userSeed.user();
        await teamSeed.join(team.id, admin, TeamRole.Admin);
        const params = { teamId: team.id };

        expectError(await request(ctx.app, teamRoutes.update, { as: member.id, params, body: { name: 'Hijacked' } }), 403, 'Team::Forbidden');
        expect((await request(ctx.app, teamRoutes.update, { as: admin.id, params, body: { name: 'By admin' } })).data().name).toBe('By admin');
        expect((await request(ctx.app, teamRoutes.update, { as: user.id, params, body: { name: 'By owner' } })).data().name).toBe('By owner');
    });

    it('promotes a member to admin', async () => {
        const { team, user, member } = await withMember(TeamRole.Member);

        const res = await request(ctx.app, teamRoutes.updateMemberRole, {
            as: user.id,
            params: {
                teamId: team.id,
                userId: member.id
            },
            body: { role: TeamRole.Admin }
        });

        expect(res.status).toBe(200);
        expect(res.data().role).toBe(TeamRole.Admin);
    });

    it('never demotes or removes the owner of a team', async () => {
        const { team, user, member } = await withMember(TeamRole.Admin);
        const params = {
            teamId: team.id,
            userId: user.id
        };

        expectError(await request(ctx.app, teamRoutes.updateMemberRole, { as: member.id, params, body: { role: TeamRole.Member } }),
            409, 'Team::LastOwner');

        expectError(await request(ctx.app, teamRoutes.removeMember, { as: member.id, params }), 409, 'Team::LastOwner');
        expect(await TeamMembership.findOneBy({ teamId: team.id, userId: user.id })).toMatchObject({ role: TeamRole.Owner });
    });

    it('lets an admin remove a member', async () => {
        const { team, user, member } = await withMember(TeamRole.Member);

        const res = await request(ctx.app, teamRoutes.removeMember, {
            as: user.id,
            params: {
                teamId: team.id,
                userId: member.id
            }
        });

        expect(res.status).toBe(204);
        expect(await TeamMembership.existsBy({ teamId: team.id, userId: member.id })).toBe(false);
    });

    it('refuses to remove the last team the caller belongs to', async () => {
        const { team, user } = await teamSeed.ownedTeam();

        expectError(await request(ctx.app, teamRoutes.remove, { as: user.id, params: { teamId: team.id } }), 409, 'Team::LastTeam');
        expect(await Team.existsBy({ id: team.id })).toBe(true);
    });

    describe('with a webhook receiver', () => {
        useWebhooks();

        it('announces a new team with its organization and creator', async () => {
            const user = await userSeed.user();

            const res = await request(ctx.app, teamRoutes.create, { as: user.id, body: PROFILE });

            expect(deliveries('team.created')).toEqual([{
                teamId: res.data().id,
                orgId: await defaultOrganizationId(),
                createdBy: user.id
            }]);
        });

        it('announces a removed team so the services holding its data drop them', async () => {
            const kept = await teamSeed.ownedTeam();
            const removed = await teamSeed.ownedTeam(kept.user);

            const res = await request(ctx.app, teamRoutes.remove, { as: kept.user.id, params: { teamId: removed.team.id } });

            expect(res.status).toBe(204);
            expect(await Team.countBy({ id: removed.team.id })).toBe(0);
            expect(deliveries('team.removed')).toEqual([{ teamId: removed.team.id }]);
        });
    });
});
