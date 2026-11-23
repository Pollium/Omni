import User from '@/modules/user/models/User';
import JWTService from '@readable/auth/JWTService';
import { Session } from '../../contracts/domain/auth';

export default class SessionService{
    #jwt = new JWTService();

    create(user: User): Session{
        return this.#of(user, this.#jwt.sign(user.id));
    }

    renew(user: User, expiresAt: number): Session{
        return this.#of(user, this.#jwt.signUntil(user.id, expiresAt));
    }

    #of(user: User, token: string): Session{
        return {
            token,
            user
        };
    }
}
