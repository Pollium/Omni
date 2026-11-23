import OAuthAccount from '@/modules/auth/models/OAuthAccount';
import OrganizationMembership from '@/modules/organizations/models/OrganizationMembership';
import User from '@/modules/user/models/User';
import { sessionCutoffs } from '@readable/auth/verifiedSession';
import { tableRef } from '@readable/utils/models/table-ref';
import { directoryRoutes } from '@omni/contracts/directory/routes';
import { OrganizationRole } from '@omni/contracts/organization/domain';
import { OAuthProviderName } from '@/modules/auth/contracts/domain/oauth';
import { defaultOrganizationId } from '@/modules/organizations/services/DefaultOrganization';
import { teamSeed } from '@/modules/teams/tests/TeamSeed';
import { userSeed } from '@/modules/user/tests/UserSeed';
import { config } from '@/shared/config';
import { SERVICE, deliveries, useApp, useWebhooks } from '@tests/harness';
import { request, expectError } from '@tests/request';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

describe('DirectoryController', () => {
    const ctx = useApp();

    it('answers only callers presenting the service key', async () => {
        const user = await userSeed.user();
        const params = { userId: user.id };

        expectError(await request(ctx.app, directoryRoutes.user, { params }), 401, 'Auth::Unauthorized');
        expectError(await request(ctx.app, directoryRoutes.user, {
            params,
            headers: { [config.serviceKeyHeader]: 'not-the-key' }
        }), 401, 'Auth::Unauthorized');

        expectError(await request(ctx.app, directoryRoutes.grantRole, {
            params: {
                userId: user.id,
                role: 'staff'
            },
            as: user.id
        }), 401, 'Auth::Unauthorized');

        expect((await request(ctx.app, directoryRoutes.user, { params, headers: SERVICE })).data()).toMatchObject({
            id: user.id,
            roles: [],
            hasPassword: false
        });
    });

    it('grants a role once however many times it is asked', async () => {
        const user = await userSeed.user();
        const params = {
            userId: user.id,
            role: 'staff'
        };

        const first = await request(ctx.app, directoryRoutes.grantRole, { params, headers: SERVICE });
        const second = await request(ctx.app, directoryRoutes.grantRole, { params, headers: SERVICE });

        expect(first.status).toBe(200);
        expect(first.data().roles).toEqual(['staff']);
        expect(second.data().roles).toEqual(['staff']);
        expect((await User.findOneByOrFail({ id: user.id })).roles).toEqual(['staff']);
    });

    it('revokes one role and keeps the others', async () => {
        const user = await userSeed.user(['staff', 'billing']);

        const res = await request(ctx.app, directoryRoutes.revokeRole, {
            params: {
                userId: user.id,
                role: 'staff'
            },
            headers: SERVICE
        });

        expect(res.status).toBe(200);
        expect(res.data().roles).toEqual(['billing']);
        const again = await request(ctx.app, directoryRoutes.revokeRole, {
            params: {
                userId: user.id,
                role: 'staff'
            },
            headers: SERVICE
        });

        expect(again.data().roles).toEqual(['billing']);
    });

    it('lists the holders of a role, oldest first', async () => {
        const first = await userSeed.user(['staff']);
        await userSeed.user();
        const second = await userSeed.user(['staff', 'billing']);
        await userSeed.user(['billing']);

        const res = await request(ctx.app, directoryRoutes.usersWithRole, { params: { role: 'staff' }, headers: SERVICE });

        expect(res.status).toBe(200);
        expect(res.data().map((user) => user.id)).toEqual([first.id, second.id]);
    });

    it.each(['Staff', '9lives', 'with.dot', 'a'.repeat(33)])('refuses the role name %s', async (role) => {
        const user = await userSeed.user();
        const params = {
            userId: user.id,
            role
        };

        expectError(await request(ctx.app, directoryRoutes.grantRole, { params, headers: SERVICE }), 400, 'Directory::InvalidRole');
        expectError(await request(ctx.app, directoryRoutes.revokeRole, { params, headers: SERVICE }), 400, 'Directory::InvalidRole');
        expectError(await request(ctx.app, directoryRoutes.usersWithRole, { params: { role }, headers: SERVICE }), 400, 'Directory::InvalidRole');
        expect((await User.findOneByOrFail({ id: user.id })).roles).toEqual([]);
    });

    it('refuses a role for an account that does not exist', async () => {
        expectError(await request(ctx.app, directoryRoutes.grantRole, {
            params: {
                userId: randomUUID(),
                role: 'staff'
            },
            headers: SERVICE
        }), 404, 'User::NotFound');
    });

    it('searches accounts by name, username or email, leaving out the holders of a role', async () => {
        const ada = await userSeed.user();
        await User.update({ id: ada.id }, { fullName: 'Ada Lovelace' });
        const staff = await userSeed.user(['staff']);
        await User.update({ id: staff.id }, { fullName: 'Ada Staff' });
        const byEmail = await userSeed.user();
        await User.update({ id: byEmail.id }, { email: 'countess.ada@example.test' });
        await userSeed.user();

        const all = await request(ctx.app, directoryRoutes.searchUsers, { query: { q: ' ada ' }, headers: SERVICE });
        const outside = await request(ctx.app, directoryRoutes.searchUsers, {
            query: {
                q: 'ADA',
                withoutRole: 'staff'
            },
            headers: SERVICE
        });

        expect(all.data().map((user) => user.id).sort()).toEqual([ada.id, staff.id, byEmail.id].sort());
        expect(outside.data().map((user) => user.id).sort()).toEqual([ada.id, byEmail.id].sort());
    });

    it('lists everyone without a role when the search is empty, up to the search limit', async () => {
        for(let i = 0; i < config.directory.searchLimit + 2; i++){
            await userSeed.user();
        }
        const staff = await userSeed.user(['staff']);

        const res = await request(ctx.app, directoryRoutes.searchUsers, { query: { withoutRole: 'staff' }, headers: SERVICE });

        expect(res.data()).toHaveLength(config.directory.searchLimit);
        expect(res.data().map((user) => user.id)).not.toContain(staff.id);
    });

    it('finds an account by username whatever its case', async () => {
        const user = await userSeed.user();

        const res = await request(ctx.app, directoryRoutes.userByUsername, { params: { username: user.username.toUpperCase() }, headers: SERVICE });

        expect(res.data().id).toBe(user.id);
        expectError(await request(ctx.app, directoryRoutes.userByUsername, { params: { username: 'nobody' }, headers: SERVICE }),
            404, 'User::NotFound');
    });

    it('summarizes the accounts it is asked about and skips the missing ones', async () => {
        const user = await userSeed.user();

        const res = await request(ctx.app, directoryRoutes.userSummaries, {
            body: { userIds: [user.id, randomUUID()] },
            headers: SERVICE
        });

        expect(res.data()).toEqual([{
            userId: user.id,
            fullName: user.fullName,
            username: user.username,
            avatarUrl: null
        }]);
    });

    it('counts signups for as many days as the caller asks', async () => {
        await userSeed.user();
        const earlier = await userSeed.user();
        const manager = User.getRepository().manager;
        await manager.query(`UPDATE ${tableRef(manager, User).table} SET "createdAt" = NOW() - INTERVAL '10 days' WHERE id = $1`, [earlier.id]);

        const res = await request(ctx.app, directoryRoutes.userCensus, { headers: SERVICE, query: { days: '14' } });

        expect(res.status).toBe(200);
        expect(res.data().total).toBe(2);
        expect(res.data().signups).toHaveLength(14);
        expect(res.data().signups.reduce((sum, day) => sum + day.count, 0)).toBe(2);
    });

    it('counts how each account arrived, by password and by every OAuth provider', async () => {
        await userSeed.passwordUser();
        const linked = await userSeed.user();
        await OAuthAccount.create({
            userId: linked.id,
            provider: OAuthProviderName.GitHub,
            providerAccountId: 'gh-1'
        }).save();

        const res = await request(ctx.app, directoryRoutes.userCensus, { headers: SERVICE, query: { days: '7' } });

        expect(res.data().methods).toEqual(expect.arrayContaining([
            {
                method: 'password',
                count: 1
            },
            {
                method: 'github',
                count: 1
            }
        ]));

        expect(res.data().methods).toHaveLength(2);
    });

    it('counts signups by the source and campaign they came from', async () => {
        const tagged = await userSeed.user();
        await User.update({ id: tagged.id }, {
            signupSource: 'newsletter',
            signupCampaign: 'spring'
        });

        await userSeed.user();

        const res = await request(ctx.app, directoryRoutes.userCensus, { headers: SERVICE, query: { days: '7' } });

        expect(res.data().sources).toEqual([{
            source: 'newsletter',
            campaign: 'spring',
            count: 1
        }]);
    });

    it('refuses a span of days it cannot count', async () => {
        for(const days of ['0', '-3', '2.5', '400', 'month']){
            expectError(await request(ctx.app, directoryRoutes.userCensus, { headers: SERVICE, query: { days } }),
                400, 'Directory::InvalidCensusRange');
        }

        expectError(await request(ctx.app, directoryRoutes.userCensus, { headers: SERVICE }), 400, 'Directory::InvalidCensusRange');
    });

    it('tells services how one account signs in and whether it proved its email', async () => {
        const proven = await userSeed.provenUser();
        await OAuthAccount.create({
            userId: proven.id,
            provider: OAuthProviderName.Google,
            providerAccountId: 'g-1'
        }).save();

        await OAuthAccount.create({
            userId: proven.id,
            provider: OAuthProviderName.GitHub,
            providerAccountId: 'gh-2'
        }).save();

        const fresh = await userSeed.user();
        await User.update({ id: proven.id }, { phone: '+56912345678' });

        const linked = await request(ctx.app, directoryRoutes.userAccount, { headers: SERVICE, params: { userId: proven.id } });
        const bare = await request(ctx.app, directoryRoutes.userAccount, { headers: SERVICE, params: { userId: fresh.id } });

        expect(linked.status).toBe(200);
        expect(linked.data().providers).toEqual([OAuthProviderName.Google, OAuthProviderName.GitHub]);
        expect(linked.data().emailVerifiedAt).not.toBeNull();
        expect(linked.data().phone).toBe('+56912345678');
        expect(bare.data()).toEqual({
            phone: null,
            emailVerifiedAt: null,
            providers: []
        });

        expectError(await request(ctx.app, directoryRoutes.userAccount, { headers: SERVICE, params: { userId: randomUUID() } }),
            404, 'User::NotFound');
    });

    it('removes an account the same way the user would', async () => {
        const user = await userSeed.user();

        const res = await request(ctx.app, directoryRoutes.removeUser, { headers: SERVICE, params: { userId: user.id } });

        expect(res.status).toBe(204);
        await expect(User.findOneBy({ id: user.id })).resolves.toBeNull();
        expectError(await request(ctx.app, directoryRoutes.removeUser, { headers: SERVICE, params: { userId: user.id } }),
            404, 'User::NotFound');
    });

    it('hands services the default organization and its roster', async () => {
        const orgId = await defaultOrganizationId();
        const member = await userSeed.user();
        await OrganizationMembership.create({
            orgId,
            userId: member.id,
            role: OrganizationRole.Member
        }).save();

        const found = await request(ctx.app, directoryRoutes.defaultOrg, { headers: SERVICE });
        const roster = await request(ctx.app, directoryRoutes.orgMembers, { headers: SERVICE, params: { orgId } });

        expect(found.data()).toEqual({ orgId });
        expect(roster.status).toBe(200);
        expect(roster.data().map((entry) => entry.userId)).toContain(member.id);
    });

    it('hands services a team, its members and the teams of an account', async () => {
        const { user, team } = await teamSeed.ownedTeam();

        const found = await request(ctx.app, directoryRoutes.team, { headers: SERVICE, params: { teamId: team.id } });
        const members = await request(ctx.app, directoryRoutes.teamMembers, { headers: SERVICE, params: { teamId: team.id } });
        const teams = await request(ctx.app, directoryRoutes.userTeams, { headers: SERVICE, params: { userId: user.id } });

        expect(found.data().id).toBe(team.id);
        expect(members.data().map((member) => member.userId)).toEqual([user.id]);
        expect(teams.data().map((entry) => entry.id)).toEqual([team.id]);
    });

    describe('with a webhook receiver', () => {
        useWebhooks();

        it('announces an account it removed and the sessions it revoked', async () => {
            const user = await userSeed.user();

            await request(ctx.app, directoryRoutes.removeUser, { headers: SERVICE, params: { userId: user.id } });

            expect(deliveries('user.removed')).toEqual([{ userId: user.id }]);
            expect(deliveries('session.revoked')).toEqual([{
                userId: user.id,
                cutoff: await sessionCutoffs.cutoffOf(user.id)
            }]);
        });
    });
});
