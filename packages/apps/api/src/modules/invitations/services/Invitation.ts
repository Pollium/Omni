import Organization from '@/modules/organizations/models/Organization';
import MembershipService from '@/modules/organizations/services/Membership';
import Team from '@/modules/teams/models/Team';
import TeamMembership from '@/modules/teams/models/TeamMembership';
import TeamMembershipService from '@/modules/teams/services/TeamMembership';
import User from '@/modules/user/models/User';
import Invitation from '../models/Invitation';
import Mail from '@/modules/mail/services/Mail';
import MembershipHook from '@/modules/webhooks/services/MembershipHook';
import { findOrThrow } from '@readable/utils/models/find-or-throw';
import { InvitationStatus, AcceptedInvitation, InvitationPreview } from '@omni/contracts/invitation/domain';
import { CreateInvitationInput } from '@omni/contracts/invitation/http';
import { OrganizationRole } from '@omni/contracts/organization/domain';
import { TeamRole } from '@omni/contracts/team/domain';
import { InvitationError } from '../contracts/domain/errors';
import { assertTeamAdmin } from '@/modules/teams/middlewares/TeamAdminRoute';
import { config } from '@/shared/config';
import { invitationCopy } from '@/modules/mail/copy';
import { createHash, randomBytes } from 'node:crypto';

const HOUR_MS = 60 * 60 * 1000;

export default class InvitationService{
    #orgMemberships = new MembershipService();
    #teamMemberships = new TeamMembershipService();
    #membershipHook = new MembershipHook();
    #mail = new Mail();

    async listForTeam(userId: string, teamId: string): Promise<Invitation[]>{
        await assertTeamAdmin(teamId, userId);

        return Invitation.find({
            where: { teamId, status: InvitationStatus.Pending },
            order: { id: 'DESC' }
        });
    }

    async create(userId: string, input: CreateInvitationInput): Promise<Invitation>{
        await assertTeamAdmin(input.teamId, userId);

        const team = await findOrThrow(Team, { id: input.teamId }, InvitationError.NotFound);
        const email = input.email.trim().toLowerCase();

        await this.#assertNotAlreadyIn(team, email);

        const pending = await Invitation.findOneBy({
            teamId: team.id,
            email,
            status: InvitationStatus.Pending
        });
        if(pending !== null) throw InvitationError.AlreadyInvited();

        await this.#assertSeat(team.orgId, email);

        const token = randomBytes(32).toString('hex');
        const invitation = await Invitation.create({
            orgId: team.orgId,
            teamId: team.id,
            email,
            tokenHash: this.#hash(token),
            teamRole: input.role ?? TeamRole.Member,
            status: InvitationStatus.Pending,
            invitedBy: userId,
            expiresAt: new Date(Date.now() + config.invitation.ttlHours * HOUR_MS)
        }).save();

        const inviter = await findOrThrow(User, { id: userId }, InvitationError.NotFound);
        await this.#mail.send({
            to: email,
            language: input.language,
            ...invitationCopy[input.language]({
                inviter: inviter.fullName,
                team: team.name,
                url: `${config.home.url}/invite/${token}`,
                hours: config.invitation.ttlHours
            })
        });

        return invitation;
    }

    async preview(token: string): Promise<InvitationPreview>{
        const invitation = await this.#pending(token);
        const team = await findOrThrow(Team, { id: invitation.teamId }, InvitationError.NotFound);
        const organization = await findOrThrow(Organization, { id: invitation.orgId }, InvitationError.NotFound);
        const inviter = invitation.invitedBy === null
            ? null
            : await User.findOne({ where: { id: invitation.invitedBy }, select: { fullName: true } });

        return {
            teamName: team.name,
            orgName: organization.name,
            invitedByName: inviter?.fullName ?? null,
            email: invitation.email,
            expiresAt: invitation.expiresAt.toISOString()
        };
    }

    async accept(token: string, userId: string): Promise<AcceptedInvitation>{
        const invitation = await this.#pending(token);
        const user = await findOrThrow(User, { id: userId }, InvitationError.NotFound);
        if(user.email.toLowerCase() !== invitation.email) throw InvitationError.EmailMismatch();

        const alreadyInTeam = await TeamMembership.findOneBy({ teamId: invitation.teamId, userId });
        if(alreadyInTeam !== null) throw InvitationError.AlreadyAMember();

        if(!await this.#orgMemberships.isMember(invitation.orgId, userId)){
            await this.#assertSeat(invitation.orgId, user.email);
            await this.#orgMemberships.enroll(invitation.orgId, userId, OrganizationRole.Member);
        }

        await this.#teamMemberships.join(invitation.teamId, userId, invitation.teamRole);

        invitation.status = InvitationStatus.Accepted;
        await invitation.save();

        return {
            teamId: invitation.teamId,
            orgId: invitation.orgId,
            role: invitation.teamRole
        };
    }

    async revoke(userId: string, invitationId: string){
        const invitation = await findOrThrow(Invitation, { id: invitationId }, InvitationError.NotFound);
        await assertTeamAdmin(invitation.teamId, userId);

        invitation.status = InvitationStatus.Revoked;
        await invitation.save();
    }

    async #pending(token: string): Promise<Invitation>{
        const invitation = await findOrThrow(
            Invitation,
            { tokenHash: this.#hash(token) },
            InvitationError.NotFound
        );

        if(invitation.status === InvitationStatus.Accepted) throw InvitationError.AlreadyAccepted();
        if(invitation.status === InvitationStatus.Revoked) throw InvitationError.Revoked();
        if(invitation.expiresAt < new Date()) throw InvitationError.Expired();

        return invitation;
    }

    async #assertSeat(orgId: string, email: string){
        if(!await this.#membershipHook.allows({ orgId, email })) throw InvitationError.SeatsExhausted();
    }

    async #assertNotAlreadyIn(team: Team, email: string){
        const invitee = await User.findOne({ where: { email }, select: { id: true } });
        if(invitee === null) return;

        const membership = await TeamMembership.findOneBy({ teamId: team.id, userId: invitee.id });
        if(membership !== null) throw InvitationError.AlreadyAMember();
    }

    #hash(token: string): string{
        return createHash('sha256').update(token).digest('hex');
    }
}
