import OAuthAccount from '@/modules/auth/models/OAuthAccount';
import Invitation from '@/modules/invitations/models/Invitation';
import OrganizationMembership from '@/modules/organizations/models/OrganizationMembership';
import Team from '@/modules/teams/models/Team';
import User from '@/modules/user/models/User';
import BaseQueue from '@readable/queues/BaseQueue';
import { sessionCutoffs } from '@readable/auth/verifiedSession';
import { consoleRoutes } from '@omni/contracts/console/routes';
import { InvitationStatus } from '@omni/contracts/invitation/domain';
import { OrganizationRole } from '@omni/contracts/organization/domain';
import { TeamRole } from '@omni/contracts/team/domain';
import { WebhookDelivery } from '@omni/contracts/webhooks/domain';
import { OAuthProviderName } from '@/modules/auth/contracts/domain/oauth';
import { defaultOrganizationId } from '@/modules/organizations/services/DefaultOrganization';
import { teamSeed } from '@/modules/teams/tests/TeamSeed';
import { userSeed } from '@/modules/user/tests/UserSeed';
import { config } from '@/shared/config';
import { deliveries, mails, useApp, useWebhooks } from '@tests/harness';
import { expectError, request } from '@tests/request';
import { Job, JobType } from 'bullmq';
import { describe, expect, it, vi } from 'vitest';

const DAY_MS = 24 * 60 * 60 * 1000;

const admin = () => userSeed.user(['admin']);

const linkGoogle = (user: User) => OAuthAccount.create({
    userId: user.id,
    provider: OAuthProviderName.Google,
    providerAccountId: `google-${user.id}`
}).save();

const age = (user: User, days: number) => User.update({ id: user.id }, { createdAt: new Date(Date.now() - days * DAY_MS) });

const sharedTeam = async (owner: User, members: User[], name: string) => {
    const team = await Team.create({ orgId: await defaultOrganizationId(), name, description: '', createdBy: owner.id }).save();
    await teamSeed.join(team.id, owner, TeamRole.Owner);
    for(const member of members) await teamSeed.join(team.id, member);

    return team;
};

const invite = async (team: Team, email: string, expiresInDays: number) => Invitation.create({
    orgId: team.orgId,
    teamId: team.id,
    email,
    tokenHash: `hash-${email}`,
    teamRole: TeamRole.Member,
    status: InvitationStatus.Pending,
    invitedBy: team.createdBy,
    expiresAt: new Date(Date.now() + expiresInDays * DAY_MS)
}).save();

const job = (delivery: Partial<WebhookDelivery>, fields: Partial<Job>) => ({
    data: {
        id: 'delivery',
        type: 'user.created',
        payload: { userId: 'u', fullName: 'U', username: 'u' },
        occurredAt: '2026-11-24T10:00:00.000Z',
        ...delivery
    },
    attemptsMade: 1,
    failedReason: '',
    finishedOn: undefined,
    ...fields
}) as unknown as Job;

describe('ConsoleController', () => {
    const ctx = useApp();

    it('opens only to a signed-in holder of the admin role', async () => {
        const member = await userSeed.user(['staff']);
        const owner = await admin();

        expectError(await request(ctx.app, consoleRoutes.me), 401, 'Auth::Unauthorized');
        expectError(await request(ctx.app, consoleRoutes.me, { as: member.id }), 403, 'Console::NotAdmin');
        expectError(await request(ctx.app, consoleRoutes.users, { as: member.id }), 403, 'Console::NotAdmin');

        expect((await request(ctx.app, consoleRoutes.me, { as: owner.id })).data()).toEqual({
            id: owner.id,
            fullName: owner.fullName,
            email: owner.email,
            avatarUrl: null
        });
    });

    it('lists accounts newest first with how each one signs in', async () => {
        const owner = await admin();
        const older = await userSeed.passwordUser();
        const google = await userSeed.provenUser();
        await linkGoogle(google);
        await age(older, 3);

        const res = await request(ctx.app, consoleRoutes.users, { as: owner.id, query: { limit: 2 } });

        expect(res.status).toBe(200);
        expect(res.data().total).toBe(3);
        expect(res.data().users.map((user) => user.id)).toEqual([google.id, owner.id]);
        expect(res.data().users[0]).toMatchObject({ methods: ['google'], verified: true, roles: [] });
        const next = await request(ctx.app, consoleRoutes.users, { as: owner.id, query: { limit: 2, offset: 2 } });
        expect(next.data().users).toMatchObject([{ id: older.id, methods: ['password'], verified: false }]);
    });

    it('narrows the list by view, sign-in method and a search that matches wildcards literally', async () => {
        const owner = await admin();
        const google = await userSeed.provenUser();
        await linkGoogle(google);
        const stale = await userSeed.passwordUser();
        await age(stale, 10);
        const percent = await userSeed.user();
        await User.update({ id: percent.id }, { fullName: '100% Real' });

        const ids = async (query: Record<string, string>) => (await request(ctx.app, consoleRoutes.users, { as: owner.id, query })).data().users.map((user) => user.id);

        expect(await ids({ view: 'roles' })).toEqual([owner.id]);
        expect(await ids({ view: 'unverified' })).toEqual([percent.id, owner.id, stale.id]);
        expect(await ids({ view: 'week' })).toEqual([percent.id, google.id, owner.id]);
        expect(await ids({ method: 'google' })).toEqual([google.id]);
        expect(await ids({ method: 'password' })).toEqual([stale.id]);
        expect(await ids({ q: '%' })).toEqual([percent.id]);
        expect(await ids({ q: google.email.toUpperCase() })).toEqual([google.id]);
        expectError(await request(ctx.app, consoleRoutes.users, { as: owner.id, query: { view: 'everyone' } }), 400, 'Console::InvalidFilter');
        expectError(await request(ctx.app, consoleRoutes.users, { as: owner.id, query: { method: 'myspace' } }), 400, 'Console::InvalidFilter');
    });

    it('counts every view for the tabs', async () => {
        const owner = await admin();
        const stale = await userSeed.provenUser();
        await age(stale, 10);
        await userSeed.user();

        expect((await request(ctx.app, consoleRoutes.userCounts, { as: owner.id })).data()).toEqual({
            all: 3,
            roles: 1,
            unverified: 2,
            week: 2
        });
    });

    it('details an account with its organizations and teams, each with its size', async () => {
        const owner = await admin();
        const user = await userSeed.provenUser();
        await OrganizationMembership.create({ orgId: await defaultOrganizationId(), userId: user.id, role: OrganizationRole.Member }).save();
        const team = await sharedTeam(owner, [user], 'Calculus');

        const res = await request(ctx.app, consoleRoutes.user, { as: owner.id, params: { userId: user.id } });

        expect(res.status).toBe(200);
        expect(res.data()).toMatchObject({
            id: user.id,
            verified: true,
            emailVerifiedAt: user.emailVerifiedAt?.toISOString(),
            organizations: [config.organization.defaultName],
            teams: [{ id: team.id, name: 'Calculus', role: TeamRole.Member, members: 2 }]
        });
    });

    it('grants and revokes a role, but never the admin role its caller holds', async () => {
        const owner = await admin();
        const user = await userSeed.user();
        const params = { userId: user.id, role: 'staff' };

        expect((await request(ctx.app, consoleRoutes.grantRole, { as: owner.id, params })).data().roles).toEqual(['staff']);
        expect((await request(ctx.app, consoleRoutes.revokeRole, { as: owner.id, params })).data().roles).toEqual([]);
        expectError(await request(ctx.app, consoleRoutes.grantRole, { as: owner.id, params: { userId: user.id, role: 'Not A Role' } }), 400, 'Directory::InvalidRole');
        expectError(await request(ctx.app, consoleRoutes.revokeRole, { as: owner.id, params: { userId: owner.id, role: 'admin' } }), 409, 'Console::OwnAdmin');
        expect((await User.findOneByOrFail({ id: owner.id })).roles).toEqual(['admin']);
    });

    it('mails a reset link to the account, in the language the admin asks for', async () => {
        const owner = await admin();
        const user = await userSeed.passwordUser();

        const res = await request(ctx.app, consoleRoutes.sendPasswordReset, { as: owner.id, params: { userId: user.id }, body: { language: 'es' } });

        expect(res.status).toBe(204);
        expect(mails()).toMatchObject([{ to: user.email, language: 'es' }]);
    });

    describe('with a webhook receiver', () => {
        useWebhooks();

        it('signs an account out everywhere and tells the product', async () => {
            const owner = await admin();
            const user = await userSeed.user();

            expect((await request(ctx.app, consoleRoutes.revokeSessions, { as: owner.id, params: { userId: user.id } })).status).toBe(204);
            expect(deliveries('session.revoked')).toEqual([{ userId: user.id, cutoff: await sessionCutoffs.cutoffOf(user.id) }]);
        });

        it('removes another account, never its own', async () => {
            const owner = await admin();
            const user = await userSeed.user();

            expectError(await request(ctx.app, consoleRoutes.removeUser, { as: owner.id, params: { userId: owner.id } }), 409, 'Console::OwnAccount');
            expect((await request(ctx.app, consoleRoutes.removeUser, { as: owner.id, params: { userId: user.id } })).status).toBe(204);
            await expect(User.findOneBy({ id: user.id })).resolves.toBeNull();
            expect(deliveries('user.removed')).toEqual([{ userId: user.id }]);
        });
    });

    it('sums up the instance over twice the span asked, so the page can compare', async () => {
        const owner = await admin();
        const google = await userSeed.provenUser();
        await linkGoogle(google);
        const team = await sharedTeam(owner, [], 'Physics');
        await invite(team, 'soon@example.test', 3);
        await invite(team, 'late@example.test', -1);

        const res = await request(ctx.app, consoleRoutes.overview, { as: owner.id, query: { days: 7 } });

        expect(res.data()).toMatchObject({
            total: 2,
            verified: 1,
            methods: [{ method: 'google', count: 1 }],
            pendingInvitations: 1,
            expiredInvitations: 1
        });
        expect(res.data().signups).toHaveLength(14);
        expect(res.data().recent.map((user) => user.id)).toEqual([google.id, owner.id]);
        expectError(await request(ctx.app, consoleRoutes.overview, { as: owner.id, query: { days: 400 } }), 400, 'Console::InvalidFilter');
    });

    it('lists every role in use with its holders, admin first', async () => {
        const owner = await admin();
        const staff = await userSeed.user(['staff', 'billing']);

        expect((await request(ctx.app, consoleRoutes.roles, { as: owner.id })).data()).toMatchObject([
            { name: 'admin', count: 1, holders: [{ id: owner.id }] },
            { name: 'billing', count: 1, holders: [{ id: staff.id }] },
            { name: 'staff', count: 1, holders: [{ id: staff.id }] }
        ]);
    });

    it('describes the default organization and its teams, largest first', async () => {
        const owner = await admin();
        const [first, second] = [await userSeed.user(), await userSeed.user()];
        const orgId = await defaultOrganizationId();
        for(const user of [owner, first, second]) await OrganizationMembership.create({ orgId, userId: user.id, role: OrganizationRole.Member }).save();
        const solo = await sharedTeam(first, [], 'Alone');
        const big = await sharedTeam(owner, [first, second], 'Everyone');
        await invite(big, 'new@example.test', 5);

        expect((await request(ctx.app, consoleRoutes.organization, { as: owner.id })).data()).toEqual({
            id: orgId,
            name: config.organization.defaultName,
            members: 3,
            teams: 2,
            sharedTeams: 1,
            pendingInvitations: 1
        });
        const teams = (await request(ctx.app, consoleRoutes.teams, { as: owner.id })).data();
        expect(teams.total).toBe(2);
        expect(teams.teams).toMatchObject([
            { id: big.id, members: 3, owner: { id: owner.id, fullName: owner.fullName } },
            { id: solo.id, members: 1, owner: { id: first.id } }
        ]);
        expect((await request(ctx.app, consoleRoutes.invitations, { as: owner.id })).data()).toMatchObject([{ email: 'new@example.test', team: 'Everyone' }]);
    });

    it('shows the apps, the hooks and the last deliveries without the service key', async () => {
        const owner = await admin();
        const queued: Partial<Record<JobType, Job[]>> = {
            completed: [job({ id: 'sent', occurredAt: '2026-11-24T09:00:00.000Z' }, { finishedOn: Date.parse('2026-11-24T09:00:01.000Z') })],
            failed: [job({ id: 'refused', type: 'user.removed', occurredAt: '2026-11-24T08:00:00.000Z' }, { attemptsMade: 12, failedReason: 'Webhook::Refused 500', finishedOn: Date.parse('2026-11-24T11:00:00.000Z') })],
            delayed: [job({ id: 'again', occurredAt: '2026-11-24T10:00:00.000Z' }, { attemptsMade: 2, failedReason: 'timeout' })]
        };
        vi.spyOn(BaseQueue.prototype, 'jobs').mockImplementation(async (states) => states.flatMap((state) => queued[state] ?? []));
        vi.spyOn(BaseQueue.prototype, 'count').mockResolvedValue(1);

        const res = await request(ctx.app, consoleRoutes.apps, { as: owner.id });

        expect(res.body).not.toContain(config.serviceKey);
        expect(res.data()).toMatchObject({
            apps: config.apps,
            serviceKey: config.serviceKey.slice(-4),
            deliveries: {
                pending: 1,
                failed: 1,
                recent: [
                    { id: 'again', state: 'retrying', attempts: 2, error: 'timeout', finishedAt: null },
                    { id: 'sent', state: 'delivered', error: null, finishedAt: '2026-11-24T09:00:01.000Z' },
                    { id: 'refused', type: 'user.removed', state: 'failed', error: 'Webhook::Refused 500' }
                ]
            }
        });
        expect(res.data().events).toContain('session.revoked');
    });

    it('shows the settings it reads from env, with no secret in them', async () => {
        const owner = await admin();

        const res = await request(ctx.app, consoleRoutes.settings, { as: owner.id });

        expect(res.body).not.toContain(config.oauth.google.clientSecret);
        expect(res.data()).toMatchObject({
            name: 'Omni',
            webUrl: config.webUrl,
            defaultOrganization: config.organization.defaultName,
            invitationTtlHours: 168,
            providers: [{ name: 'google', clientId: 'google-id' }, { name: 'microsoft', clientId: 'microsoft-id' }],
            mail: { host: '' }
        });
    });
});
