import Avatar from '../models/Avatar';
import User from '../models/User';
import OrganizationMembership from '@/modules/organizations/models/OrganizationMembership';
import PasswordService from '@readable/auth/PasswordService';
import { sessionCutoffs } from '@readable/auth/verifiedSession';
import { User as UserProfile } from '@omni/contracts/user/domain';
import { userRoutes } from '@omni/contracts/user/routes';
import { ApiResponse } from '@omni/contracts/shared/http';
import { organizationSeed } from '@/modules/organizations/tests/OrganizationSeed';
import { userSeed } from './UserSeed';
import { config } from '@/shared/config';
import { useApp, authHeader, deliveries, mails, useWebhooks } from '@tests/harness';
import { request, expectError } from '@tests/request';
import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

const issuedEarlier = (userId: string): Record<string, string> => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() - 60_000);
    const header = authHeader(userId);
    vi.useRealTimers();

    return header;
};

const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
);

const GIF = Buffer.from('R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64');

const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

const BOUNDARY = 'omni-test-boundary';

const filePayload = (buffer: Buffer): Buffer => Buffer.concat([
    Buffer.from(`--${BOUNDARY}\r\ncontent-disposition: form-data; name="file"; filename="avatar.bin"\r\ncontent-type: application/octet-stream\r\n\r\n`),
    buffer,
    Buffer.from(`\r\n--${BOUNDARY}--\r\n`)
]);

describe('UserController', () => {
    const ctx = useApp();

    const upload = (userId: string, buffer: Buffer) => ctx.app.inject({
        method: 'POST',
        url: userRoutes.uploadAvatar.path,
        headers: {
            ...authHeader(userId),
            'content-type': `multipart/form-data; boundary=${BOUNDARY}`
        },
        payload: filePayload(buffer)
    });

    const avatarOf = (userId: string) => ctx.app.inject({
        method: 'GET',
        url: userRoutes.avatar.path.replace(':userId', userId)
    });

    it('rejects unauthenticated requests', async () => {
        const res = await request(ctx.app, userRoutes.me);

        expectError(res, 401, 'Auth::Unauthorized');
    });

    it('rejects a malformed token', async () => {
        const res = await request(ctx.app, userRoutes.me, { headers: { authorization: 'Bearer not-a-token' } });

        expectError(res, 401, 'Auth::InvalidToken');
    });

    it('returns the caller profile without the password hash or the roles', async () => {
        const user = await userSeed.passwordUser();
        await User.update({ id: user.id }, { roles: ['staff'] });

        const res = await request(ctx.app, userRoutes.me, { as: user.id });

        expect(res.status).toBe(200);
        expect(res.data()).toMatchObject({
            id: user.id,
            fullName: user.fullName,
            username: user.username,
            email: user.email
        });

        expect(res.body).not.toContain('passwordHash');
        expect(res.body).not.toContain('roles');
        expect(res.body).not.toContain('staff');
    });

    it('returns 404 for a token of a missing user', async () => {
        const res = await request(ctx.app, userRoutes.me, { as: randomUUID() });

        expectError(res, 404, 'User::NotFound');
    });

    it('updates the username and bio', async () => {
        const user = await userSeed.user();

        const res = await request(ctx.app, userRoutes.updateProfile, {
            as: user.id,
            body: {
                username: 'renamed',
                bio: 'New bio'
            }
        });

        expect(res.status).toBe(200);
        expect(res.data()).toMatchObject({
            id: user.id,
            username: 'renamed',
            bio: 'New bio'
        });

        const updated = await User.findOneByOrFail({ id: user.id });
        expect(updated.username).toBe('renamed');
    });

    it('prunes unknown keys so neither the email nor the roles can be patched', async () => {
        const user = await userSeed.user();

        const res = await request(ctx.app, userRoutes.updateProfile, {
            as: user.id,
            body: {
                email: 'hijacked@example.test',
                roles: ['admin']
            } as never
        });

        expect(res.status).toBe(200);
        const updated = await User.findOneByOrFail({ id: user.id });
        expect(updated.email).toBe(user.email);
        expect(updated.roles).toEqual([]);
    });

    it('rejects a profile update to a taken username', async () => {
        const user = await userSeed.user();
        const other = await userSeed.user();

        const res = await request(ctx.app, userRoutes.updateProfile, {
            as: user.id,
            body: { username: other.username }
        });

        expectError(res, 409, 'User::UsernameAlreadyTaken');
        const unchanged = await User.findOneByOrFail({ id: user.id });
        expect(unchanged.username).toBe(user.username);
    });

    it('rejects an out-of-range username with a per-field error map', async () => {
        const user = await userSeed.user();

        const res = await request(ctx.app, userRoutes.updateProfile, {
            as: user.id,
            body: { username: 'ab' }
        });

        expectError(res, 400, 'Request::ValidationFailed');
        expect(res.json()).toMatchObject({ errors: { username: 'At least 3 characters' } });
    });

    it('changes the password', async () => {
        const user = await userSeed.passwordUser('old-password-1');

        const res = await request(ctx.app, userRoutes.changePassword, {
            as: user.id,
            body: {
                currentPassword: 'old-password-1',
                newPassword: 'new-password-1'
            }
        });

        expect(res.status).toBe(200);
        const updated = await User.findOneByOrFail({ id: user.id });
        await expect(new PasswordService().verify('new-password-1', updated.passwordHash!)).resolves.toBe(true);
    });

    it('signs out every session issued before a password change but keeps the one it hands back', async () => {
        const user = await userSeed.passwordUser('old-password-1');
        const stolen = issuedEarlier(user.id);

        const res = await request(ctx.app, userRoutes.changePassword, {
            as: user.id,
            body: {
                currentPassword: 'old-password-1',
                newPassword: 'new-password-1'
            }
        });

        expectError(await request(ctx.app, userRoutes.me, { headers: stolen }), 401, 'Auth::InvalidToken');
        const kept = await request(ctx.app, userRoutes.me, { headers: { authorization: `Bearer ${res.data().token}` } });
        expect(kept.status).toBe(200);
    });

    it('rejects a password change with a wrong current password', async () => {
        const user = await userSeed.passwordUser('old-password-1');

        const res = await request(ctx.app, userRoutes.changePassword, {
            as: user.id,
            body: {
                currentPassword: 'wrong-password',
                newPassword: 'new-password-1'
            }
        });

        expectError(res, 401, 'User::InvalidPassword');
    });

    it('rejects a password change for a user without a password', async () => {
        const user = await userSeed.user();

        const res = await request(ctx.app, userRoutes.changePassword, {
            as: user.id,
            body: {
                currentPassword: 'anything-at-all',
                newPassword: 'new-password-1'
            }
        });

        expectError(res, 401, 'User::InvalidPassword');
    });

    it('changes the email, unproves it and tells the previous address in the language asked for', async () => {
        const user = await userSeed.passwordUser();
        await User.update({ id: user.id }, { emailVerifiedAt: new Date() });

        const res = await request(ctx.app, userRoutes.changeEmail, {
            as: user.id,
            body: {
                email: 'new-address@example.test',
                currentPassword: 'password-123',
                language: 'es'
            }
        });

        expect(res.status).toBe(200);
        expect(res.data()).toMatchObject({ email: 'new-address@example.test' });
        const updated = await User.findOneByOrFail({ id: user.id });
        expect(updated.email).toBe('new-address@example.test');
        expect(updated.emailVerifiedAt).toBeNull();
        expect(mails()).toEqual([{
            to: user.email,
            language: 'es',
            subject: 'Cambió el correo de tu cuenta de Omni',
            heading: 'Cambió el correo de tu cuenta',
            lines: [
                'El correo de tu cuenta ahora es new-address@example.test.',
                'Si no fuiste tú, restablece tu contraseña ahora.'
            ],
            action: null
        }]);
    });

    it('refuses an email change from a session that does not know the current password', async () => {
        const user = await userSeed.passwordUser();

        const res = await request(ctx.app, userRoutes.changeEmail, {
            as: user.id,
            body: {
                email: 'attacker@example.test',
                currentPassword: 'guessed-password',
                language: 'en'
            }
        });

        expectError(res, 401, 'User::InvalidPassword');
        const unchanged = await User.findOneByOrFail({ id: user.id });
        expect(unchanged.email).toBe(user.email);
        expect(mails()).toEqual([]);
    });

    it('rejects an email already registered to someone else', async () => {
        const user = await userSeed.passwordUser();
        const other = await userSeed.user();

        const res = await request(ctx.app, userRoutes.changeEmail, {
            as: user.id,
            body: {
                email: other.email,
                currentPassword: 'password-123',
                language: 'en'
            }
        });

        expectError(res, 409, 'User::EmailAlreadyTaken');
        const unchanged = await User.findOneByOrFail({ id: user.id });
        expect(unchanged.email).toBe(user.email);
    });

    it('accepts the callers own current email without a conflict or a notification', async () => {
        const user = await userSeed.passwordUser();

        const res = await request(ctx.app, userRoutes.changeEmail, {
            as: user.id,
            body: {
                email: user.email,
                currentPassword: 'password-123',
                language: 'en'
            }
        });

        expect(res.status).toBe(200);
        expect(mails()).toEqual([]);
    });

    it('changes the phone number', async () => {
        const user = await userSeed.user();

        const res = await request(ctx.app, userRoutes.changePhone, {
            as: user.id,
            body: { phone: '+56912345678' }
        });

        expect(res.status).toBe(200);
        expect(res.data()).toMatchObject({ phone: '+56912345678' });
        const updated = await User.findOneByOrFail({ id: user.id });
        expect(updated.phone).toBe('+56912345678');
    });

    it('switches the active organization only to one the caller belongs to', async () => {
        const user = await userSeed.user();
        const { organization } = await organizationSeed.memberOf(user);
        const foreign = await organizationSeed.memberOf();

        const res = await request(ctx.app, userRoutes.setActiveOrganization, {
            as: user.id,
            body: { orgId: organization.id }
        });

        expect(res.status).toBe(200);
        expect(res.data().activeOrgId).toBe(organization.id);
        expectError(await request(ctx.app, userRoutes.setActiveOrganization, {
            as: user.id,
            body: { orgId: foreign.organization.id }
        }), 403, 'Organization::NotAMember');

        expect((await User.findOneByOrFail({ id: user.id })).activeOrgId).toBe(organization.id);
    });

    it('deletes the profile with its memberships and answers 204', async () => {
        const { user } = await organizationSeed.memberOf();

        const res = await request(ctx.app, userRoutes.deleteMe, { as: user.id });

        expect(res.status).toBe(204);
        expect(res.body).toBe('');
        await expect(User.findOneBy({ id: user.id })).resolves.toBeNull();
        expect(await OrganizationMembership.countBy({ userId: user.id })).toBe(0);
    });

    it('replaces the avatar with an uploaded image and serves it back', async () => {
        const user = await userSeed.user();

        const res = await upload(user.id, PNG);

        expect(res.statusCode).toBe(200);
        const avatarUrl = res.json<ApiResponse<UserProfile>>().data.avatarUrl;
        expect(avatarUrl).toContain(`${config.apiUrl}/users/${user.id}/avatar?v=`);
        expect((await User.findOneByOrFail({ id: user.id })).avatarUrl).toBe(avatarUrl);
        const served = await avatarOf(user.id);
        expect(served.statusCode).toBe(200);
        expect(served.rawPayload.equals(PNG)).toBe(true);
        expect(served.headers).toMatchObject({
            'content-type': 'image/png',
            'cache-control': `public, max-age=${config.avatar.cacheSeconds}`,
            'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'",
            'x-content-type-options': 'nosniff'
        });
    });

    it('moves the avatar url on every upload so caches fetch the new image', async () => {
        const user = await userSeed.user();

        const first = (await upload(user.id, PNG)).json<ApiResponse<UserProfile>>().data.avatarUrl;
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(Date.now() + 1000);
        const second = (await upload(user.id, PNG)).json<ApiResponse<UserProfile>>().data.avatarUrl;
        vi.useRealTimers();

        expect(second).not.toBe(first);
        expect(await Avatar.countBy({ userId: user.id })).toBe(1);
    });

    it.each([
        ['plain text', Buffer.from('plain text, not an image')],
        ['an SVG', SVG],
        ['a GIF', GIF]
    ])('rejects %s as an avatar and keeps the old one', async (_label, file) => {
        const user = await userSeed.user();
        await upload(user.id, PNG);

        const res = await upload(user.id, file);

        expect(res.statusCode).toBe(415);
        expect(res.json()).toMatchObject({ error: 'Avatar::UnsupportedType' });
        expect((await avatarOf(user.id)).headers['content-type']).toBe('image/png');
    });

    it('answers 404 for the avatar of a user who has none', async () => {
        const user = await userSeed.user();

        const res = await request(ctx.app, userRoutes.avatar, { params: { userId: user.id } });

        expectError(res, 404, 'Avatar::NotFound');
    });

    describe('with a webhook receiver', () => {
        useWebhooks();

        it('announces a deleted account and the sessions it revoked', async () => {
            const user = await userSeed.user();

            await request(ctx.app, userRoutes.deleteMe, { as: user.id });

            expect(deliveries('user.removed')).toEqual([{ userId: user.id }]);
            expect(deliveries('session.revoked')).toEqual([{
                userId: user.id,
                cutoff: await sessionCutoffs.cutoffOf(user.id)
            }]);
        });

        it('announces the sessions a password change revokes', async () => {
            const user = await userSeed.passwordUser('old-password-1');

            await request(ctx.app, userRoutes.changePassword, {
                as: user.id,
                body: {
                    currentPassword: 'old-password-1',
                    newPassword: 'new-password-1'
                }
            });

            expect(deliveries('session.revoked')).toEqual([{
                userId: user.id,
                cutoff: await sessionCutoffs.cutoffOf(user.id)
            }]);
        });

        it('announces a switch of the active organization', async () => {
            const { user, organization } = await organizationSeed.memberOf();

            await request(ctx.app, userRoutes.setActiveOrganization, {
                as: user.id,
                body: { orgId: organization.id }
            });

            expect(deliveries('user.activeOrg.changed')).toEqual([{
                userId: user.id,
                orgId: organization.id
            }]);
        });
    });
});
