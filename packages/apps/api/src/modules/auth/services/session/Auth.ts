import User from '@/modules/user/models/User';
import SignupService from '@/modules/user/services/account/Signup';
import SessionService from './Session';
import PasswordService from '@readable/auth/PasswordService';
import ValidationError from '@readable/errors/Validation';
import { isUniqueViolation } from '@readable/utils/models/is-unique-violation';
import { EmailAvailability } from '@omni/contracts/auth/domain';
import { SignInInput, SignUpInput } from '@omni/contracts/auth/http';
import { Session } from '../../contracts/domain/auth';
import { AuthError } from '../../contracts/domain/errors';

export default class AuthService{
    #session = new SessionService();
    #signup = new SignupService();
    #password = new PasswordService();

    async signIn(query: SignInInput): Promise<Session>{
        const user = await User.findOneBy({ email: query.email });

        if(!user || user.passwordHash === null || !(await this.#password.verify(query.password, user.passwordHash))){
            throw AuthError.InvalidCredentials();
        }

        return this.#session.create(user);
    }

    async signUp(query: SignUpInput): Promise<Session>{
        if(await User.findOneBy({ email: query.email })) throw AuthError.EmailAlreadyRegistered();
        if(await User.findOneBy({ username: query.username })) throw AuthError.UsernameAlreadyTaken();

        const user = await this.#insertUser(query, await this.#password.hash(query.password));
        await this.#signup.welcome(user, null);

        return this.#session.create(user);
    }

    async checkEmail(email: string | undefined): Promise<EmailAvailability>{
        if(!email) throw new ValidationError({ email: 'Required' });

        return { exists: await User.existsBy({ email }) };
    }

    async #insertUser(query: SignUpInput, passwordHash: string): Promise<User>{
        try{
            return await User.create({
                fullName: query.fullName,
                username: query.username,
                email: query.email,
                bio: '',
                phone: null,
                passwordHash,
                avatarUrl: null,
                roles: [],
                signupSource: query.source ?? null,
                signupCampaign: query.campaign ?? null
            }).save();
        }catch(error){
            throw this.#duplicateUserError(error);
        }
    }

    #duplicateUserError(error: unknown): unknown{
        if(!isUniqueViolation(error)) return error;

        const driver = error.driverError as { message?: string; detail?: string };
        const detail = [driver.message, driver.detail, error.message].join(' ');

        return detail.includes('username') ? AuthError.UsernameAlreadyTaken() : AuthError.EmailAlreadyRegistered();
    }
}
