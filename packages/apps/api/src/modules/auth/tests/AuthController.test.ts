import Avatar from '@/modules/user/models/Avatar';
import OrganizationMembership from '@/modules/organizations/models/OrganizationMembership';
import PasswordResetToken from '../models/PasswordResetToken';
import User from '@/modules/user/models/User';
import DeliveryQueue from '@/modules/webhooks/queues/Delivery';
import JWTService from '@readable/auth/JWTService';
import { sessionCutoffs } from '@readable/auth/verifiedSession';
import { authRoutes } from '@omni/contracts/auth/routes';
import { userRoutes } from '@omni/contracts/user/routes';
import { teamRoutes } from '@omni/contracts/team/routes';
import { OrganizationRole } from '@omni/contracts/organization/domain';
import { TeamRole } from '@omni/contracts/team/domain';
import { Language } from '@omni/contracts/shared/language';
import { defaultOrganizationId } from '@/modules/organizations/services/DefaultOrganization';
import { userSeed } from '@/modules/user/tests/UserSeed';
import { config } from '@/shared/config';
import { authHeader, deliveries, enqueued, mails, useApp, useWebhooks } from '@tests/harness';
import { expectError, request } from '@tests/request';
import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

const RESET_TOKEN = 'reset-token-from-the-mail';

const VERIFIER = 'verifier-kept-by-the-browser-that-asked-for-the-code';

const SIGN_UP = {
    fullName: 'Ada Lovelace',
    email: 'ada@example.test',
    username: 'ada',
    password: 'password-123'
};

const challengeOf = (verifier: string): string => createHash('sha256').update(verifier).digest('base64url');

const issuedEarlier = (userId: string): Record<string, string> => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() - 60_000);
    const header = authHeader(userId);
    vi.useRealTimers();

    return header;
};

const mailedReset = (userId: string, expiresAt = new Date(Date.now() + 60_000)) => PasswordResetToken.create({
    userId,
    tokenHash: createHash('sha256').update(RESET_TOKEN).digest('hex'),
    expiresAt,
    consumedAt: null
}).save();

const tokenOf = (url: string): string => new URL(url).searchParams.get('token')!;

describe('AuthController', () => {
    const ctx = useApp();

    it('signs up into the default organization with one personal team and a generated avatar', async () => {
        const res = await request(ctx.app, authRoutes.signUp, { body: SIGN_UP });

        expect(res.status).toBe(201);
        expect(res.body).not.toContain('passwordHash');
        expect(res.body).not.toContain('roles');
        const { user } = res.data();
        const teams = await request(ctx.app, teamRoutes.mine, { as: user.id });
        const avatar = await Avatar.findOneByOrFail({ userId: user.id });

        expect(user).toMatchObject({
            fullName: SIGN_UP.fullName,
            email: SIGN_UP.email,
            username: SIGN_UP.username,
            phone: null
        });

        expect(await OrganizationMembership.findBy({ userId: user.id })).toEqual([expect.objectContaining({
            orgId: await defaultOrganizationId(),
            role: OrganizationRole.Member
        })]);

        expect(teams.data()).toEqual([expect.objectContaining({
            name: "Ada Lovelace's Team",
            role: TeamRole.Owner
        })]);

        expect(user.avatarUrl).toContain(`${config.apiUrl}/users/${user.id}/avatar?v=`);
        expect(avatar.contentType).toBe('image/svg+xml');
    });

    it('keeps the bio and phone an app collected before creating the account', async () => {
        const res = await request(ctx.app, authRoutes.signUp, {
            body: {
                ...SIGN_UP,
                bio: 'Learning Rust',
                phone: '+56912345678'
            }
        });

        expect(res.status).toBe(201);
        expect(res.data().user).toMatchObject({
            bio: 'Learning Rust',
            phone: '+56912345678'
        });
    });

    it('keeps the source and campaign a sign-up came from', async () => {
        const res = await request(ctx.app, authRoutes.signUp, {
            body: {
                ...SIGN_UP,
                source: 'newsletter',
                campaign: 'spring'
            }
        });

        const user = await User.findOneByOrFail({ id: res.data().user.id });
        expect(user.signupSource).toBe('newsletter');
        expect(user.signupCampaign).toBe('spring');
        expect(user.roles).toEqual([]);
    });

    it('refuses a second account with a registered email or a taken username', async () => {
        await request(ctx.app, authRoutes.signUp, { body: SIGN_UP });

        expectError(await request(ctx.app, authRoutes.signUp, {
            body: {
                ...SIGN_UP,
                username: 'someone-else'
            }
        }), 409, 'Auth::EmailAlreadyRegistered');

        expectError(await request(ctx.app, authRoutes.signUp, {
            body: {
                ...SIGN_UP,
                email: 'someone-else@example.test'
            }
        }), 409, 'Auth::UsernameAlreadyTaken');

        expect(await User.count()).toBe(1);
    });

    it('signs in with the right password and nothing else', async () => {
        const user = await userSeed.passwordUser();
        const passwordless = await userSeed.user();

        const res = await request(ctx.app, authRoutes.signIn, {
            body: {
                email: user.email,
                password: 'password-123'
            }
        });

        expect(res.status).toBe(200);
        expect(new JWTService().verify(res.data().token).sub).toBe(user.id);
        expectError(await request(ctx.app, authRoutes.signIn, {
            body: {
                email: user.email,
                password: 'wrong-password'
            }
        }), 401, 'Auth::InvalidCredentials');

        expectError(await request(ctx.app, authRoutes.signIn, {
            body: {
                email: passwordless.email,
                password: 'password-123'
            }
        }), 401, 'Auth::InvalidCredentials');

        expectError(await request(ctx.app, authRoutes.signIn, {
            body: {
                email: 'nobody@example.test',
                password: 'password-123'
            }
        }), 401, 'Auth::InvalidCredentials');
    });

    it('tells whether an email is already registered', async () => {
        const user = await userSeed.user();

        const taken = await request(ctx.app, authRoutes.checkEmail, { query: { email: user.email } });
        const free = await request(ctx.app, authRoutes.checkEmail, { query: { email: 'free@example.test' } });

        expect(taken.data()).toEqual({ exists: true });
        expect(free.data()).toEqual({ exists: false });
        expectError(await request(ctx.app, authRoutes.checkEmail), 400, 'Request::ValidationFailed');
    });

    it('signs out every session issued before a password reset, signs the user back in and counts the email as proven', async () => {
        const user = await userSeed.passwordUser();
        const stolen = issuedEarlier(user.id);
        await mailedReset(user.id);

        const res = await request(ctx.app, authRoutes.resetPassword, {
            body: {
                token: RESET_TOKEN,
                newPassword: 'brand-new-password'
            }
        });

        expect(res.status).toBe(200);
        expectError(await request(ctx.app, userRoutes.me, { headers: stolen }), 401, 'Auth::InvalidToken');
        const me = await request(ctx.app, userRoutes.me, { headers: { authorization: `Bearer ${res.data().token}` } });
        expect(me.status).toBe(200);
        expect((await User.findOneByOrFail({ id: user.id })).emailVerifiedAt).not.toBeNull();
    });

    it.each<[Language, string, string]>([
        ['es', 'Restablece tu contraseña de Omni', 'Elegir contraseña nueva'],
        ['en', 'Reset your Omni password', 'Choose a new password']
    ])('mails the reset link in the language it was asked in (%s), and the link resets the password', async (language, subject, label) => {
        const user = await userSeed.passwordUser();

        const res = await request(ctx.app, authRoutes.forgotPassword, {
            body: {
                email: user.email,
                language
            }
        });

        expect(res.status).toBe(204);
        expect(mails()).toEqual([expect.objectContaining({
            to: user.email,
            language,
            subject,
            action: {
                label,
                url: expect.stringContaining(`${config.webUrl}/reset-password?token=`)
            }
        })]);

        const reset = await request(ctx.app, authRoutes.resetPassword, {
            body: {
                token: tokenOf(mails()[0].action!.url),
                newPassword: 'brand-new-password'
            }
        });

        expect(reset.status).toBe(200);
        const signIn = await request(ctx.app, authRoutes.signIn, {
            body: {
                email: user.email,
                password: 'brand-new-password'
            }
        });

        expect(signIn.status).toBe(200);
    });

    it('answers a reset for an unknown email like any other and mails nothing', async () => {
        const res = await request(ctx.app, authRoutes.forgotPassword, {
            body: {
                email: 'nobody@example.test',
                language: 'en'
            }
        });

        expect(res.status).toBe(204);
        expect(mails()).toEqual([]);
        expect(await PasswordResetToken.count()).toBe(0);
    });

    it('voids the previous reset link once another one is mailed', async () => {
        const user = await userSeed.passwordUser();
        const body = {
            email: user.email,
            language: 'en' as const
        };

        await request(ctx.app, authRoutes.forgotPassword, { body });
        await request(ctx.app, authRoutes.forgotPassword, { body });

        const [first, second] = mails().map((mail) => tokenOf(mail.action!.url));
        expectError(await request(ctx.app, authRoutes.resetPassword, {
            body: {
                token: first,
                newPassword: 'brand-new-password'
            }
        }), 400, 'Auth::InvalidResetToken');

        expect((await request(ctx.app, authRoutes.resetPassword, {
            body: {
                token: second,
                newPassword: 'brand-new-password'
            }
        })).status).toBe(200);
    });

    it('accepts a reset link only once', async () => {
        const user = await userSeed.passwordUser();
        await mailedReset(user.id);
        const body = {
            token: RESET_TOKEN,
            newPassword: 'brand-new-password'
        };

        expect((await request(ctx.app, authRoutes.resetPassword, { body })).status).toBe(200);
        expectError(await request(ctx.app, authRoutes.resetPassword, {
            body: {
                ...body,
                newPassword: 'attacker-password'
            }
        }), 400, 'Auth::InvalidResetToken');
    });

    it('refuses an expired reset link and keeps the password', async () => {
        const user = await userSeed.passwordUser();
        await mailedReset(user.id, new Date(Date.now() - 1000));

        expectError(await request(ctx.app, authRoutes.resetPassword, {
            body: {
                token: RESET_TOKEN,
                newPassword: 'brand-new-password'
            }
        }), 400, 'Auth::InvalidResetToken');

        expect((await request(ctx.app, authRoutes.signIn, {
            body: {
                email: user.email,
                password: 'password-123'
            }
        })).status).toBe(200);
    });

    it('hands a session to another app without stretching how long it lasts', async () => {
        const user = await userSeed.user();
        const jwt = new JWTService();
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(Date.now() - 60_000);
        const presented = jwt.sign(user.id);
        vi.useRealTimers();

        const { code } = (await request(ctx.app, authRoutes.handoff, {
            headers: { authorization: `Bearer ${presented}` },
            body: { challenge: challengeOf(VERIFIER) }
        })).data();

        const exchanged = (await request(ctx.app, authRoutes.oauthExchange, {
            body: {
                code,
                verifier: VERIFIER
            }
        })).data();

        expect(jwt.verify(exchanged.token).exp).toBe(jwt.verify(presented).exp);
    });

    it('refuses a handoff code redeemed by a browser that did not ask for it, and burns it', async () => {
        const attacker = await userSeed.user();
        const { code } = (await request(ctx.app, authRoutes.handoff, {
            as: attacker.id,
            body: { challenge: challengeOf(VERIFIER) }
        })).data();

        expectError(await request(ctx.app, authRoutes.oauthExchange, {
            body: {
                code,
                verifier: 'verifier-held-by-the-victim-browser-instead-of-ours'
            }
        }), 401, 'OAuth::InvalidHandoffCode');

        expectError(await request(ctx.app, authRoutes.oauthExchange, {
            body: {
                code,
                verifier: VERIFIER
            }
        }), 401, 'OAuth::InvalidHandoffCode');
    });

    it('refuses to hand off a session without a signed-in caller', async () => {
        expectError(await request(ctx.app, authRoutes.handoff, { body: { challenge: challengeOf(VERIFIER) } }),
            401, 'Auth::Unauthorized');
    });

    describe('with a webhook receiver', () => {
        useWebhooks();

        it('announces a new account only once it belongs to an organization and a team', async () => {
            const res = await request(ctx.app, authRoutes.signUp, { body: SIGN_UP });

            const { user } = res.data();
            expect(enqueued(DeliveryQueue).map((delivery) => delivery.type)).toEqual(['team.created', 'user.created']);
            expect(deliveries('user.created')).toEqual([{
                userId: user.id,
                fullName: SIGN_UP.fullName,
                username: SIGN_UP.username
            }]);
        });

        it('announces the sessions a password reset revokes, with the cutoff it wrote', async () => {
            const user = await userSeed.passwordUser();
            await mailedReset(user.id);

            await request(ctx.app, authRoutes.resetPassword, {
                body: {
                    token: RESET_TOKEN,
                    newPassword: 'brand-new-password'
                }
            });

            expect(deliveries('session.revoked')).toEqual([{
                userId: user.id,
                cutoff: await sessionCutoffs.cutoffOf(user.id)
            }]);
        });
    });
});
