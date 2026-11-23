import Invitation from '../models/Invitation';
import OrganizationMembership from '@/modules/organizations/models/OrganizationMembership';
import TeamMembership from '@/modules/teams/models/TeamMembership';
import { invitationRoutes } from '@omni/contracts/invitation/routes';
import { InvitationStatus } from '@omni/contracts/invitation/domain';
import { CreateInvitationInput } from '@omni/contracts/invitation/http';
import { OrganizationRole } from '@omni/contracts/organization/domain';
import { TeamRole } from '@omni/contracts/team/domain';
import { SIGNATURE_HEADER } from '@omni/contracts/webhooks/domain';
import { organizationSeed } from '@/modules/organizations/tests/OrganizationSeed';
import { teamSeed } from '@/modules/teams/tests/TeamSeed';
import { userSeed } from '@/modules/user/tests/UserSeed';
import { MEMBERSHIP_HOOK_URL, mails, useApp, useMembershipHook } from '@tests/harness';
import { request, expectError } from '@tests/request';
import { describe, expect, it, vi } from 'vitest';

describe('InvitationController', () => {
    const ctx = useApp();

    const invite = (userId: string, body: Omit<CreateInvitationInput, 'language'>) => request(ctx.app, invitationRoutes.create, {
        as: userId,
        body: {
            ...body,
            language: 'en'
        }
    });

    const mailedToken = (): string => {
        const { url } = mails().at(-1)!.action!;

        return url.slice(url.lastIndexOf('/') + 1);
    };

    const invitedTeam = async () => {
        const seed = await teamSeed.ownedTeam();
        const invitee = await userSeed.user();
        const res = await invite(seed.user.id, {
            teamId: seed.team.id,
            email: invitee.email
        });

        return {
            ...seed,
            invitee,
            invitation: res.data(),
            token: mailedToken()
        };
    };

    it('invites an email into a team as a member unless told otherwise', async () => {
        const { user, team, organization } = await teamSeed.ownedTeam();

        const res = await invite(user.id, {
            teamId: team.id,
            email: 'Invitee@Example.test'
        });

        expect(res.status).toBe(201);
        expect(res.data()).toMatchObject({
            orgId: organization.id,
            teamId: team.id,
            email: 'invitee@example.test',
            teamRole: TeamRole.Member,
            status: InvitationStatus.Pending,
            invitedBy: user.id
        });

        expect(res.body).not.toContain('tokenHash');
    });

    it('lets only the admins of a team invite into it', async () => {
        const { team } = await teamSeed.ownedTeam();
        const member = await userSeed.user();
        await teamSeed.join(team.id, member);
        const stranger = await userSeed.user();
        const body = {
            teamId: team.id,
            email: 'invitee@example.test'
        };

        expectError(await invite(member.id, body), 403, 'Team::Forbidden');
        expectError(await invite(stranger.id, body), 403, 'Team::NotAMember');
        expect(await Invitation.count()).toBe(0);
        expect(mails()).toEqual([]);
    });

    it('refuses to invite someone already in the team', async () => {
        const { user, team } = await teamSeed.ownedTeam();
        const member = await userSeed.user();
        await teamSeed.join(team.id, member);

        expectError(await invite(user.id, {
            teamId: team.id,
            email: member.email.toUpperCase()
        }), 409, 'Invitation::AlreadyAMember');
    });

    it('refuses a second pending invitation for the same email', async () => {
        const { user, team, invitee } = await invitedTeam();

        expectError(await invite(user.id, {
            teamId: team.id,
            email: invitee.email.toUpperCase()
        }), 409, 'Invitation::AlreadyInvited');

        expect(await Invitation.count()).toBe(1);
    });

    it('previews a pending invitation without a session', async () => {
        const { user, team, organization, invitee, token } = await invitedTeam();

        const res = await request(ctx.app, invitationRoutes.preview, { params: { token } });

        expect(res.data()).toEqual({
            teamName: team.name,
            orgName: organization.name,
            invitedByName: user.fullName,
            email: invitee.email,
            expiresAt: expect.any(String)
        });

        expectError(await request(ctx.app, invitationRoutes.preview, { params: { token: 'not-a-token' } }), 404, 'Invitation::NotFound');
    });

    it('lists the pending invitations of a team to its admins only', async () => {
        const { user, team, invitation, invitee } = await invitedTeam();

        const res = await request(ctx.app, invitationRoutes.listForTeam, { as: user.id, query: { teamId: team.id } });

        expect(res.data().map((entry) => entry.id)).toEqual([invitation.id]);
        expectError(await request(ctx.app, invitationRoutes.listForTeam, { as: invitee.id, query: { teamId: team.id } }),
            403, 'Team::NotAMember');
    });

    it('accepts an invitation into the team and the organization it belongs to', async () => {
        const { team, organization, invitee, token } = await invitedTeam();

        const res = await request(ctx.app, invitationRoutes.accept, { as: invitee.id, params: { token } });

        expect(res.status).toBe(200);
        expect(res.data()).toEqual({
            teamId: team.id,
            orgId: organization.id,
            role: TeamRole.Member
        });

        expect(await TeamMembership.findOneBy({ teamId: team.id, userId: invitee.id })).toMatchObject({ role: TeamRole.Member });
        expect(await OrganizationMembership.findOneBy({ orgId: organization.id, userId: invitee.id })).toMatchObject({ role: OrganizationRole.Member });
        expectError(await request(ctx.app, invitationRoutes.accept, { as: invitee.id, params: { token } }), 409, 'Invitation::AlreadyAccepted');
    });

    it('gives the invitee the team role the invitation was sent with', async () => {
        const { user, team } = await teamSeed.ownedTeam();
        const invitee = await userSeed.user();
        await invite(user.id, {
            teamId: team.id,
            email: invitee.email,
            role: TeamRole.Admin
        });

        const token = mailedToken();

        await request(ctx.app, invitationRoutes.accept, { as: invitee.id, params: { token } });

        expect(await TeamMembership.findOneBy({ teamId: team.id, userId: invitee.id })).toMatchObject({ role: TeamRole.Admin });
    });

    it('refuses an invitation accepted from an account with another email', async () => {
        const { team, token } = await invitedTeam();
        const intruder = await userSeed.user();

        expectError(await request(ctx.app, invitationRoutes.accept, { as: intruder.id, params: { token } }), 403, 'Invitation::EmailMismatch');
        expect(await TeamMembership.existsBy({ teamId: team.id, userId: intruder.id })).toBe(false);
    });

    it('refuses an invitation once it was revoked', async () => {
        const { user, invitee, invitation, token } = await invitedTeam();

        const revoked = await request(ctx.app, invitationRoutes.revoke, { as: user.id, params: { invitationId: invitation.id } });

        expect(revoked.status).toBe(204);
        expectError(await request(ctx.app, invitationRoutes.preview, { params: { token } }), 410, 'Invitation::Revoked');
        expectError(await request(ctx.app, invitationRoutes.accept, { as: invitee.id, params: { token } }), 410, 'Invitation::Revoked');
    });

    it('lets only the admins of the team revoke an invitation', async () => {
        const { invitee, invitation } = await invitedTeam();

        expectError(await request(ctx.app, invitationRoutes.revoke, { as: invitee.id, params: { invitationId: invitation.id } }),
            403, 'Team::NotAMember');

        expect(await Invitation.findOneByOrFail({ id: invitation.id })).toMatchObject({ status: InvitationStatus.Pending });
    });

    it('refuses an invitation past its expiry', async () => {
        const { invitee, invitation, token } = await invitedTeam();
        await Invitation.update({ id: invitation.id }, { expiresAt: new Date(Date.now() - 1000) });

        expectError(await request(ctx.app, invitationRoutes.accept, { as: invitee.id, params: { token } }), 410, 'Invitation::Expired');
    });

    describe('with a membership hook', () => {
        useMembershipHook();

        const seats = (...verdicts: boolean[]) => {
            const fetch = vi.spyOn(globalThis, 'fetch');
            for(const allowed of verdicts){
                fetch.mockImplementationOnce(async () => Response.json({ allowed }));
            }

            return fetch;
        };

        it('asks the hook for a seat in the organization before inviting', async () => {
            const { user, team, organization } = await teamSeed.ownedTeam();
            const fetch = seats(true);

            await invite(user.id, {
                teamId: team.id,
                email: 'invitee@example.test'
            });

            expect(fetch).toHaveBeenCalledWith(MEMBERSHIP_HOOK_URL, expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({
                    orgId: organization.id,
                    email: 'invitee@example.test'
                }),
                headers: expect.objectContaining({ [SIGNATURE_HEADER]: expect.stringMatching(/^t=\d+,v1=[0-9a-f]{64}$/) })
            }));
        });

        it('invites no one into an organization without seats', async () => {
            const { user, team } = await teamSeed.ownedTeam();
            seats(false);

            expectError(await invite(user.id, {
                teamId: team.id,
                email: 'invitee@example.test'
            }), 409, 'Invitation::SeatsExhausted');

            expect(await Invitation.count()).toBe(0);
            expect(mails()).toEqual([]);
        });

        it('asks again when the invitee accepts into an organization they are not in', async () => {
            const seed = await teamSeed.ownedTeam();
            const invitee = await userSeed.user();
            seats(true, false);
            await invite(seed.user.id, {
                teamId: seed.team.id,
                email: invitee.email
            });

            const token = mailedToken();

            expectError(await request(ctx.app, invitationRoutes.accept, { as: invitee.id, params: { token } }), 409, 'Invitation::SeatsExhausted');
            expect(await OrganizationMembership.existsBy({ orgId: seed.organization.id, userId: invitee.id })).toBe(false);
            expect(await TeamMembership.existsBy({ teamId: seed.team.id, userId: invitee.id })).toBe(false);
        });

        it('takes no new seat for an invitee already in the organization', async () => {
            const seed = await teamSeed.ownedTeam();
            const invitee = await userSeed.user();
            await organizationSeed.join(seed.organization.id, invitee);
            const fetch = seats(true);
            await invite(seed.user.id, {
                teamId: seed.team.id,
                email: invitee.email
            });

            const token = mailedToken();

            const res = await request(ctx.app, invitationRoutes.accept, { as: invitee.id, params: { token } });

            expect(res.status).toBe(200);
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        it('invites no one while the hook is failing', async () => {
            const { user, team } = await teamSeed.ownedTeam();
            vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('down', { status: 503 }));

            expectError(await invite(user.id, {
                teamId: team.id,
                email: 'invitee@example.test'
            }), 502, 'Webhook::MembershipHookFailed:503');

            expect(await Invitation.count()).toBe(0);
        });
    });
});
