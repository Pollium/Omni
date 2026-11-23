import User from '../../models/User';
import Mail from '@/modules/mail/services/Mail';
import SessionRevocation from '@/modules/auth/services/session/Revocation';
import SessionService from '@/modules/auth/services/session/Session';
import MembershipService from '@/modules/organizations/services/Membership';
import Webhooks from '@/modules/webhooks/services/Webhooks';
import PasswordService from '@readable/auth/PasswordService';
import { findOrThrow } from '@readable/utils/models/find-or-throw';
import { ChangeEmailInput, ChangePasswordInput, ChangePhoneInput, SetActiveOrganizationInput, UpdateProfileInput } from '@omni/contracts/user/http';
import { UserError } from '../../contracts/domain/errors';
import { Session } from '@/modules/auth/contracts/domain/auth';
import { emailChangedCopy } from '@/modules/mail/copy';
import { forgetOrgContext } from '@/modules/organizations/services/OrgContext';

export default class UserService{
    #session = new SessionService();
    #revocation = new SessionRevocation();
    #password = new PasswordService();
    #webhooks = new Webhooks();
    #mail = new Mail();

    getProfile(userId: string): Promise<User>{
        return this.#require(userId);
    }

    async updateProfile(userId: string, patch: UpdateProfileInput): Promise<User>{
        const user = await this.#require(userId);

        if(patch.username !== undefined && patch.username !== user.username){
            if(await User.existsBy({ username: patch.username })) throw UserError.UsernameAlreadyTaken();
        }

        return Object.assign(user, patch).save();
    }

    async changePassword(userId: string, query: ChangePasswordInput): Promise<Session>{
        const user = await this.#require(userId);
        await this.#assertPassword(user, query.currentPassword);

        user.passwordHash = await this.#password.hash(query.newPassword);
        await user.save();
        await this.#revocation.revoke(user.id);

        return this.#session.create(user);
    }

    async changeEmail(userId: string, query: ChangeEmailInput): Promise<User>{
        const user = await this.#require(userId);
        await this.#assertPassword(user, query.currentPassword);
        if(query.email === user.email) return user;

        if(await User.existsBy({ email: query.email })) throw UserError.EmailAlreadyTaken();

        const previousEmail = user.email;
        user.email = query.email;
        user.emailVerifiedAt = null;
        await user.save();

        await this.#mail.send({
            to: previousEmail,
            language: query.language,
            ...emailChangedCopy[query.language]({ email: user.email })
        });

        return user;
    }

    async changePhone(userId: string, query: ChangePhoneInput): Promise<User>{
        const user = await this.#require(userId);
        user.phone = query.phone;

        return user.save();
    }

    async setActiveOrganization(userId: string, input: SetActiveOrganizationInput): Promise<User>{
        const user = await this.#require(userId);
        await new MembershipService().assertMember(input.orgId, userId);

        user.activeOrgId = input.orgId;
        await user.save();
        forgetOrgContext(userId);
        await this.#webhooks.publish('user.activeOrg.changed', {
            userId,
            orgId: input.orgId
        });

        return user;
    }

    async deleteProfile(userId: string){
        const user = await this.#require(userId);
        await user.remove();
        await this.#revocation.revoke(userId);
        await this.#webhooks.publish('user.removed', { userId });
    }

    async #assertPassword(user: User, candidate: string){
        if(user.passwordHash === null || !(await this.#password.verify(candidate, user.passwordHash))){
            throw UserError.InvalidPassword();
        }
    }

    #require(userId: string): Promise<User>{
        return findOrThrow(User, { id: userId }, UserError.NotFound);
    }
}
