import Layout from '@/modules/mail/services/Layout';
import { invitationRoutes } from '@omni/contracts/invitation/routes';
import { teamSeed } from '@/modules/teams/tests/TeamSeed';
import { config } from '@/shared/config';
import { mails, useApp } from '@tests/harness';
import { request } from '@tests/request';
import { describe, expect, it } from 'vitest';

describe('invitation mail', () => {
    const ctx = useApp();

    it('mails the invitee a link into the home app, in the language the invitation was sent in', async () => {
        const { user, team } = await teamSeed.ownedTeam();

        await request(ctx.app, invitationRoutes.create, {
            as: user.id,
            body: {
                teamId: team.id,
                email: 'invitee@example.test',
                language: 'es'
            }
        });

        expect(mails()).toEqual([{
            to: 'invitee@example.test',
            language: 'es',
            subject: `${user.fullName} te invitó a ${team.name} en Omni`,
            heading: `Te invitaron a ${team.name}`,
            lines: [
                `${user.fullName} te invitó a unirte a ${team.name} en Omni.`,
                `La invitación vence en ${config.invitation.ttlHours} horas.`
            ],
            action: {
                label: 'Aceptar la invitación',
                url: expect.stringContaining(`${config.home.url}/invite/`)
            }
        }]);

        const { url } = mails()[0].action!;
        const preview = await request(ctx.app, invitationRoutes.preview, { params: { token: url.slice(url.lastIndexOf('/') + 1) } });
        expect(preview.data().email).toBe('invitee@example.test');
    });

    it('writes the sender and team names as text, never as markup', async () => {
        const { user, team } = await teamSeed.ownedTeam();
        user.fullName = '<img src="https://track.example.test/pixel">Omni Security';
        await user.save();
        team.name = '</strong><h1>Your account is locked</h1>';
        await team.save();

        await request(ctx.app, invitationRoutes.create, {
            as: user.id,
            body: {
                teamId: team.id,
                email: 'invitee@example.test',
                language: 'en'
            }
        });

        const html = new Layout().html(mails()[0]);
        expect(html).toContain('&lt;img src=&quot;https://track.example.test/pixel&quot;&gt;Omni Security');
        expect(html).toContain('&lt;/strong&gt;&lt;h1&gt;Your account is locked&lt;/h1&gt;');
        expect(html).not.toContain('<img');
        expect(html).not.toContain('<h1>Your');
    });
});
