import User from '../models/User';
import PasswordService from '@readable/auth/PasswordService';

let sequence = 0;

export default class UserSeed{
    user(roles: string[] = []): Promise<User>{
        const n = ++sequence;

        return User.create({
            fullName: `User ${n}`,
            username: `user${n}`,
            email: `user${n}@example.test`,
            bio: '',
            phone: null,
            passwordHash: null,
            avatarUrl: null,
            activeOrgId: null,
            roles,
            signupSource: null,
            signupCampaign: null,
            emailVerifiedAt: null
        }).save();
    }

    async passwordUser(password = 'password-123'): Promise<User>{
        const user = await this.user();
        user.passwordHash = await new PasswordService().hash(password);

        return user.save();
    }

    async provenUser(): Promise<User>{
        const user = await this.user();
        user.emailVerifiedAt = new Date();

        return user.save();
    }
}

export const userSeed = new UserSeed();
