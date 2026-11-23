import OrganizationMembership from '../models/OrganizationMembership';
import Organization from '../models/Organization';
import Team from '@/modules/teams/models/Team';
import TeamMembership from '@/modules/teams/models/TeamMembership';
import User from '@/modules/user/models/User';
import { organizationRoutes } from '@omni/contracts/organization/routes';
import { OrganizationRole } from '@omni/contracts/organization/domain';
import { TeamRole } from '@omni/contracts/team/domain';
import { defaultOrganizationId } from '../services/DefaultOrganization';
import { organizationSeed } from './OrganizationSeed';
import { teamSeed } from '@/modules/teams/tests/TeamSeed';
import { userSeed } from '@/modules/user/tests/UserSeed';
import { deliveries, useApp, useWebhooks } from '@tests/harness';
import { request, expectError } from '@tests/request';
import { describe, expect, it } from 'vitest';

const PROFILE = {
    name: 'Acme',
    description: 'Rockets',
    website: 'https://acme.example.test'
};

describe('OrganizationController', () => {
    const ctx = useApp();

    const teamsOf = (orgId: string, userId: string) => Promise.all(['First', 'Second'].map((name) => Team.create({
        orgId,
        name,
        description: '',
        createdBy: userId
    }).save()));

    it('rejects unauthenticated requests', async () => {
        const res = await request(ctx.app, organizationRoutes.mine);

        expectError(res, 401, 'Auth::Unauthorized');
    });

    it('lists the caller organizations with their role', async () => {
        const seed = await organizationSeed.memberOf();

        const res = await request(ctx.app, organizationRoutes.mine, { as: seed.user.id });

        expect(res.status).toBe(200);
        expect(res.data()).toEqual([expect.objectContaining({
            id: seed.organization.id,
            name: seed.organization.name,
            role: OrganizationRole.Member
        })]);
    });

    it('does not list another user organizations', async () => {
        await organizationSeed.memberOf();
        const stranger = await userSeed.user();

        const res = await request(ctx.app, organizationRoutes.mine, { as: stranger.id });

        expect(res.status).toBe(200);
        expect(res.data()).toEqual([]);
    });

    it('makes the creator the admin of a new organization', async () => {
        const user = await userSeed.user();

        const res = await request(ctx.app, organizationRoutes.create, { as: user.id, body: PROFILE });

        expect(res.status).toBe(201);
        expect(res.data()).toMatchObject({
            ...PROFILE,
            isDefault: false,
            createdBy: user.id
        });

        expect(await OrganizationMembership.findOneBy({ orgId: res.data().id, userId: user.id })).toMatchObject({ role: OrganizationRole.Admin });
    });

    it('shows an organization only to its members', async () => {
        const seed = await organizationSeed.memberOf();
        const stranger = await userSeed.user();
        const params = { orgId: seed.organization.id };

        expect((await request(ctx.app, organizationRoutes.get, { as: seed.user.id, params })).data().id).toBe(seed.organization.id);
        expectError(await request(ctx.app, organizationRoutes.get, { as: stranger.id, params }), 403, 'Organization::NotAMember');
    });

    it('lets only an admin edit the organization', async () => {
        const admin = await organizationSeed.adminOf();
        const member = await userSeed.user();
        await organizationSeed.join(admin.organization.id, member);
        const params = { orgId: admin.organization.id };

        expectError(await request(ctx.app, organizationRoutes.update, { as: member.id, params, body: { name: 'Hijacked' } }),
            403, 'Organization::Forbidden');

        const res = await request(ctx.app, organizationRoutes.update, { as: admin.user.id, params, body: { name: 'Renamed' } });

        expect(res.data().name).toBe('Renamed');
        expect((await Organization.findOneByOrFail({ id: admin.organization.id })).name).toBe('Renamed');
    });

    it('keeps the roster of the organization every account joins to itself', async () => {
        const orgId = await defaultOrganizationId();
        const caller = await userSeed.user();
        const stranger = await userSeed.user();
        await organizationSeed.join(orgId, caller);
        await organizationSeed.join(orgId, stranger);

        const res = await request(ctx.app, organizationRoutes.listMembers, { as: caller.id, params: { orgId } });

        expectError(res, 403, 'Organization::Forbidden');
    });

    it('lists the members of an organization the caller joined', async () => {
        const seed = await organizationSeed.memberOf();
        const colleague = await userSeed.user();
        await organizationSeed.join(seed.organization.id, colleague);

        const res = await request(ctx.app, organizationRoutes.listMembers, { as: seed.user.id, params: { orgId: seed.organization.id } });

        expect(res.status).toBe(200);
        expect(res.data().map((member) => member.userId).sort()).toEqual([seed.user.id, colleague.id].sort());
    });

    it('lets an admin add an existing account once', async () => {
        const admin = await organizationSeed.adminOf();
        const newcomer = await userSeed.user();
        const params = { orgId: admin.organization.id };

        const res = await request(ctx.app, organizationRoutes.addMember, { as: admin.user.id, params, body: { userId: newcomer.id } });

        expect(res.status).toBe(201);
        expect(res.data()).toMatchObject({
            userId: newcomer.id,
            role: OrganizationRole.Member
        });

        expectError(await request(ctx.app, organizationRoutes.addMember, { as: admin.user.id, params, body: { userId: newcomer.id } }),
            409, 'Organization::AlreadyAMember');
    });

    it('never demotes or removes the last admin of an organization', async () => {
        const admin = await organizationSeed.adminOf();
        const params = {
            orgId: admin.organization.id,
            userId: admin.user.id
        };

        expectError(await request(ctx.app, organizationRoutes.updateMemberRole, { as: admin.user.id, params, body: { role: OrganizationRole.Member } }),
            409, 'Organization::LastAdmin');

        expectError(await request(ctx.app, organizationRoutes.removeMember, { as: admin.user.id, params }),
            409, 'Organization::LastAdmin');

        expect(await OrganizationMembership.findOneBy({ orgId: admin.organization.id, userId: admin.user.id })).toMatchObject({ role: OrganizationRole.Admin });
    });

    it('lets an admin step down once another admin is left', async () => {
        const admin = await organizationSeed.adminOf();
        const other = await userSeed.user();
        await organizationSeed.join(admin.organization.id, other, OrganizationRole.Admin);

        const res = await request(ctx.app, organizationRoutes.updateMemberRole, {
            as: admin.user.id,
            params: {
                orgId: admin.organization.id,
                userId: admin.user.id
            },
            body: { role: OrganizationRole.Member }
        });

        expect(res.status).toBe(200);
        expect(res.data().role).toBe(OrganizationRole.Member);
    });

    it('takes a removed member out of the organization teams, keeping the teams they own', async () => {
        const admin = await organizationSeed.adminOf();
        const leaver = await userSeed.user();
        await organizationSeed.join(admin.organization.id, leaver);
        const [shared, owned] = await teamsOf(admin.organization.id, admin.user.id);
        await teamSeed.join(shared.id, leaver);
        await teamSeed.join(owned.id, leaver, TeamRole.Owner);

        const res = await request(ctx.app, organizationRoutes.removeMember, {
            as: admin.user.id,
            params: {
                orgId: admin.organization.id,
                userId: leaver.id
            }
        });

        expect(res.status).toBe(204);
        expect(await OrganizationMembership.existsBy({ orgId: admin.organization.id, userId: leaver.id })).toBe(false);
        expect(await TeamMembership.existsBy({ teamId: shared.id, userId: leaver.id })).toBe(false);
        expect(await TeamMembership.existsBy({ teamId: owned.id, userId: leaver.id })).toBe(true);
    });

    it('never removes the organization every account joins', async () => {
        const orgId = await defaultOrganizationId();
        const admin = await userSeed.user();
        await organizationSeed.join(orgId, admin, OrganizationRole.Admin);

        expectError(await request(ctx.app, organizationRoutes.remove, { as: admin.id, params: { orgId } }),
            409, 'Organization::DefaultOrganization');

        expect(await Organization.existsBy({ id: orgId })).toBe(true);
    });

    it('lets only an admin remove an organization', async () => {
        const admin = await organizationSeed.adminOf();
        const member = await userSeed.user();
        await organizationSeed.join(admin.organization.id, member);
        const params = { orgId: admin.organization.id };

        expectError(await request(ctx.app, organizationRoutes.remove, { as: member.id, params }), 403, 'Organization::Forbidden');
        expect((await request(ctx.app, organizationRoutes.remove, { as: admin.user.id, params })).status).toBe(204);
        expect(await Organization.existsBy({ id: admin.organization.id })).toBe(false);
    });

    it('lists the teams of an organization with their head count for its admins', async () => {
        const admin = await organizationSeed.adminOf();
        const [first, second] = await teamsOf(admin.organization.id, admin.user.id);
        await teamSeed.join(first.id, admin.user, TeamRole.Owner);

        const res = await request(ctx.app, organizationRoutes.listTeams, { as: admin.user.id, params: { orgId: admin.organization.id } });

        expect(res.data().map((team) => [team.id, team.memberCount])).toEqual([[first.id, 1], [second.id, 0]]);
    });

    describe('with a webhook receiver', () => {
        useWebhooks();

        it('announces a new organization with its creator', async () => {
            const user = await userSeed.user();

            const res = await request(ctx.app, organizationRoutes.create, { as: user.id, body: PROFILE });

            expect(deliveries('organization.created')).toEqual([{
                orgId: res.data().id,
                createdBy: user.id
            }]);
        });

        it('announces every team of a removed organization', async () => {
            const admin = await organizationSeed.adminOf();
            const teams = await teamsOf(admin.organization.id, admin.user.id);

            const res = await request(ctx.app, organizationRoutes.remove, { as: admin.user.id, params: { orgId: admin.organization.id } });

            expect(res.status).toBe(204);
            expect(deliveries('team.removed').map((payload) => payload.teamId).sort()).toEqual(teams.map((team) => team.id).sort());
        });

        it('moves every member off a removed organization they had active', async () => {
            const admin = await organizationSeed.adminOf();
            await User.update({ id: admin.user.id }, { activeOrgId: admin.organization.id });

            const res = await request(ctx.app, organizationRoutes.remove, { as: admin.user.id, params: { orgId: admin.organization.id } });

            expect(res.status).toBe(204);
            expect((await User.findOneByOrFail({ id: admin.user.id })).activeOrgId).toBeNull();
            expect(deliveries('user.activeOrg.changed')).toEqual([{
                userId: admin.user.id,
                orgId: admin.organization.id
            }]);
        });

        it('moves a removed member off the organization they had active', async () => {
            const admin = await organizationSeed.adminOf();
            const leaver = await userSeed.user();
            await organizationSeed.join(admin.organization.id, leaver);
            await User.update({ id: leaver.id }, { activeOrgId: admin.organization.id });

            await request(ctx.app, organizationRoutes.removeMember, {
                as: admin.user.id,
                params: {
                    orgId: admin.organization.id,
                    userId: leaver.id
                }
            });

            expect((await User.findOneByOrFail({ id: leaver.id })).activeOrgId).toBeNull();
            expect(deliveries('user.activeOrg.changed')).toEqual([{
                userId: leaver.id,
                orgId: admin.organization.id
            }]);
        });
    });
});
