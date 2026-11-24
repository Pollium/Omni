import PasswordResetService from '@/modules/auth/services/session/PasswordReset';
import SessionRevocation from '@/modules/auth/services/session/Revocation';
import User from '@/modules/user/models/User';
import RoleService from '@/modules/user/services/Roles';
import UserService from '@/modules/user/services/account/User';
import ConsoleUsers from './ConsoleUsers';
import { findOrThrow } from '@readable/utils/models/find-or-throw';
import { ConsoleUserDetail } from '@omni/contracts/console/domain';
import { Language } from '@omni/contracts/shared/language';
import { ConsoleError } from '../contracts/domain/errors';
import { UserError } from '@/modules/user/contracts/domain/errors';
import { config } from '@/shared/config';

export default class ConsoleAccounts{
    #users = new ConsoleUsers();
    #roles = new RoleService();
    #accounts = new UserService();
    #reset = new PasswordResetService();
    #revocation = new SessionRevocation();

    async grant(userId: string, role: string): Promise<ConsoleUserDetail>{
        await this.#roles.grant(userId, role);

        return this.#users.detail(userId);
    }

    async revoke(adminId: string, userId: string, role: string): Promise<ConsoleUserDetail>{
        if(adminId === userId && role === config.console.role) throw ConsoleError.OwnAdmin();
        await this.#roles.revoke(userId, role);

        return this.#users.detail(userId);
    }

    async sendPasswordReset(userId: string, language: Language){
        const user = await findOrThrow(User, { id: userId }, UserError.NotFound);
        await this.#reset.requestReset({ email: user.email, language });
    }

    async revokeSessions(userId: string){
        await findOrThrow(User, { id: userId }, UserError.NotFound);
        await this.#revocation.revoke(userId);
    }

    async remove(adminId: string, userId: string){
        if(adminId === userId) throw ConsoleError.OwnAccount();
        await this.#accounts.deleteProfile(userId);
    }
}
