import OAuthAccount from '../models/OAuthAccount';
import OrganizationMembership from '@/modules/organizations/models/OrganizationMembership';
import TeamMembership from '@/modules/teams/models/TeamMembership';
import User from '@/modules/user/models/User';
import Avatar from '@/modules/user/models/Avatar';
import OAuthHandoffService from '../services/oauth/OAuthHandoff';
import OAuthStateService from '../services/oauth/OAuthState';
import { authRoutes } from '@omni/contracts/auth/routes';
import { TeamRole } from '@omni/contracts/team/domain';
import { OAuthProviderName } from '../contracts/domain/oauth';
import { defaultOrganizationId } from '@/modules/organizations/services/DefaultOrganization';
import { userSeed } from '@/modules/user/tests/UserSeed';
import { config } from '@/shared/config';
import { useApp } from '@tests/harness';
import { request, expectError } from '@tests/request';
import { describe, expect, it, vi } from 'vitest';

const encode = (part: object): string => Buffer.from(JSON.stringify(part)).toString('base64url');

const idToken = (claims: object): string => `${encode({ alg: 'none' })}.${encode(claims)}.signature`;

const HANDOFF_CHALLENGE = 'n4bQgYhMfWWaL-qgxVrQFaO_TxsrC4Is0V1sFbDwCgg';

const answerTokens = (claims: object) => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json({
        access_token: 'access-token',
        token_type: 'Bearer',
        id_token: idToken(claims)
    }));
};

describe('OAuthController', () => {
    const ctx = useApp();

    const start = (provider: string, query: Record<string, string>) => ctx.app.inject({
        method: 'GET',
        url: `${authRoutes.oauthStart.path.replace(':provider', provider)}?${new URLSearchParams(query)}`
    });

    const callback = (provider: string, state: string) => ctx.app.inject({
        method: 'GET',
        url: `${authRoutes.oauthCallback.path.replace(':provider', provider)}?${new URLSearchParams({ code: 'code', state })}`
    });

    const providerCallback = (provider: 'google' | 'microsoft', claims: object) => {
        vi.spyOn(OAuthStateService.prototype, 'consume').mockResolvedValue({
            codeVerifier: 'verifier',
            handoffChallenge: HANDOFF_CHALLENGE,
            app: 'web',
            source: null,
            campaign: null
        });

        answerTokens(claims);

        return request(ctx.app, authRoutes.oauthCallback, {
            params: { provider },
            query: {
                code: 'code',
                state: 'state'
            }
        });
    };

    const microsoftCallback = (claims: object) => providerCallback('microsoft', claims);

    const roundTrip = async (query: Record<string, string>): Promise<URL> => {
        const owner = await userSeed.provenUser();
        const started = await start('google', {
            ...query,
            challenge: HANDOFF_CHALLENGE
        });

        const state = new URL(String(started.headers.location)).searchParams.get('state')!;
        answerTokens({
            sub: 'google-owner',
            email: owner.email,
            email_verified: true
        });

        const returned = await callback('google', state);

        expect(returned.statusCode).toBe(302);
        return new URL(String(returned.headers.location));
    };

    it('refuses to start a sign-in that no browser can redeem', async () => {
        const issued = vi.spyOn(OAuthStateService.prototype, 'issue');

        expectError(await request(ctx.app, authRoutes.oauthStart, { params: { provider: 'google' } }),
            400, 'OAuth::InvalidHandoffChallenge');

        expectError(await request(ctx.app, authRoutes.oauthStart, {
            params: { provider: 'google' },
            query: { challenge: 'too-short' }
        }), 400, 'OAuth::InvalidHandoffChallenge');

        expect(issued).not.toHaveBeenCalled();
    });

    it('refuses a provider it does not know or holds no credentials for', async () => {
        const query = { challenge: HANDOFF_CHALLENGE };

        expectError(await request(ctx.app, authRoutes.oauthStart, { params: { provider: 'myspace' }, query }),
            404, 'OAuth::UnknownProvider');

        expectError(await request(ctx.app, authRoutes.oauthStart, { params: { provider: 'github' }, query }),
            404, 'OAuth::NotConfigured');
    });

    it('sends the browser to the provider with the callback on the sign-in web', async () => {
        const res = await start('google', { challenge: HANDOFF_CHALLENGE });

        expect(res.statusCode).toBe(302);
        const location = new URL(String(res.headers.location));
        expect(location.origin).toBe('https://accounts.google.com');
        expect(location.searchParams.get('client_id')).toBe(config.oauth.google.clientId);
        expect(location.searchParams.get('redirect_uri')).toBe(`${config.webUrl}/auth/oauth/google/callback`);
        expect(location.searchParams.get('code_challenge_method')).toBe('S256');
    });

    it('returns to the sign-in web callback with the code and the app the sign-in started from', async () => {
        const location = await roundTrip({ app: 'console' });

        expect(`${location.origin}${location.pathname}`).toBe(`${config.webUrl}/auth/callback`);
        expect(location.searchParams.get('code')).not.toBe('');
        expect(location.searchParams.get('app')).toBe('console');
    });

    it.each([
        ['an unknown app', { app: 'elsewhere' }],
        ['no app', {}]
    ])('sends a sign-in started from %s back to the home app', async (_label, query) => {
        const location = await roundTrip(query);

        expect(location.searchParams.get('app')).toBe(config.home.id);
    });

    it('refuses a callback whose state it never issued', async () => {
        expectError(await request(ctx.app, authRoutes.oauthCallback, {
            params: { provider: 'google' },
            query: {
                code: 'code',
                state: 'forged-state'
            }
        }), 401, 'OAuth::StateMismatch');
    });

    it('binds the handoff code to the challenge the sign-in started with', async () => {
        const owner = await userSeed.provenUser();
        const issue = vi.spyOn(OAuthHandoffService.prototype, 'issue').mockResolvedValue('handoff-code');

        const res = await providerCallback('google', {
            sub: 'google-owner',
            email: owner.email,
            email_verified: true
        });

        expect(res.status).toBe(302);
        expect(issue).toHaveBeenCalledWith(expect.objectContaining({ user: expect.objectContaining({ id: owner.id }) }), HANDOFF_CHALLENGE);
    });

    it('refuses a Microsoft email its tenant has not verified', async () => {
        const victim = await userSeed.user();

        expectError(await microsoftCallback({
            sub: 'entra-attacker',
            email: victim.email,
            name: 'Mallory'
        }), 403, 'OAuth::EmailNotVerified');

        expect(await OAuthAccount.countBy({ userId: victim.id })).toBe(0);
    });

    it('never takes the Microsoft username for the email', async () => {
        const victim = await userSeed.user();

        expectError(await microsoftCallback({
            sub: 'entra-attacker',
            preferred_username: victim.email,
            xms_edov: true
        }), 422, 'OAuth::EmailNotProvided');

        expect(await OAuthAccount.countBy({ userId: victim.id })).toBe(0);
    });

    it.each([true, '1'])('links a Microsoft account whose email domain is verified (xms_edov %s)', async (verified) => {
        const owner = await userSeed.provenUser();
        vi.spyOn(OAuthHandoffService.prototype, 'issue').mockResolvedValue('handoff-code');

        const res = await microsoftCallback({
            sub: 'entra-owner',
            email: owner.email,
            xms_edov: verified
        });

        expect(res.status).toBe(302);
        expect(await OAuthAccount.findOneBy({ userId: owner.id })).toMatchObject({
            provider: OAuthProviderName.Microsoft,
            providerAccountId: 'entra-owner'
        });
    });

    it('creates no account for an email the IdP has not verified', async () => {
        expectError(await providerCallback('google', {
            sub: 'google-newcomer',
            email: 'unverified@example.test',
            email_verified: false
        }), 403, 'OAuth::EmailNotVerified');

        expect(await User.countBy({ email: 'unverified@example.test' })).toBe(0);
    });

    it('refuses to attach a verified identity to an account that never proved its email', async () => {
        const squatter = await userSeed.passwordUser();

        expectError(await microsoftCallback({
            sub: 'entra-owner',
            email: squatter.email,
            xms_edov: true
        }), 409, 'OAuth::EmailNotProven');

        expect(await OAuthAccount.countBy({ userId: squatter.id })).toBe(0);
    });

    it('proves the email of a linked account once its provider vouches for that same email', async () => {
        const user = await userSeed.user();
        await OAuthAccount.create({
            userId: user.id,
            provider: OAuthProviderName.Google,
            providerAccountId: 'google-linked'
        }).save();

        const res = await providerCallback('google', {
            sub: 'google-linked',
            email: user.email,
            email_verified: true
        });

        expect(res.status).toBe(302);
        expect((await User.findOneByOrFail({ id: user.id })).emailVerifiedAt).not.toBeNull();
    });

    it('gives a new Microsoft account the default organization and its personal team before handing the session off', async () => {
        const handedOff: Array<{ teams: TeamMembership[]; orgs: OrganizationMembership[] }> = [];
        vi.spyOn(OAuthHandoffService.prototype, 'issue').mockImplementation(async (session) => {
            handedOff.push({
                teams: await TeamMembership.findBy({ userId: session.user.id }),
                orgs: await OrganizationMembership.findBy({ userId: session.user.id })
            });

            return 'handoff-code';
        });

        const res = await microsoftCallback({
            sub: 'entra-newcomer',
            email: 'grace@example.test',
            name: 'Grace Hopper',
            xms_edov: true
        });

        expect(res.status).toBe(302);
        expect(handedOff).toEqual([{
            teams: [expect.objectContaining({ role: TeamRole.Owner })],
            orgs: [expect.objectContaining({ orgId: await defaultOrganizationId() })]
        }]);
    });

    it('keeps the Google picture as the avatar of a new account instead of generating one', async () => {
        vi.spyOn(OAuthHandoffService.prototype, 'issue').mockResolvedValue('handoff-code');

        await providerCallback('google', {
            sub: 'google-newcomer',
            email: 'ada@example.test',
            email_verified: true,
            name: 'Ada Lovelace',
            picture: 'https://images.example.test/ada.png'
        });

        const user = await User.findOneByOrFail({ email: 'ada@example.test' });
        expect(user.avatarUrl).toBe('https://images.example.test/ada.png');
        expect(user.emailVerifiedAt).not.toBeNull();
        expect(await Avatar.countBy({ userId: user.id })).toBe(0);
    });
});
