import User from '@/modules/user/models/User';
import Mail from '@/modules/mail/services/Mail';
import PasswordResetToken from '../../models/PasswordResetToken';
import SessionRevocation from './Revocation';
import SessionService from './Session';
import PasswordService from '@readable/auth/PasswordService';
import { findOrThrow } from '@readable/utils/models/find-or-throw';
import { ForgotPasswordInput, ResetPasswordInput } from '@omni/contracts/auth/http';
import { Session } from '../../contracts/domain/auth';
import { AuthError } from '../../contracts/domain/errors';
import { resetCopy } from '@/modules/mail/copy';
import { config } from '@/shared/config';
import { randomBytes, createHash } from 'node:crypto';
import { IsNull } from 'typeorm';

const MINUTE_MS = 60 * 1000;

export default class PasswordResetService{
    readonly #tokenBytes = 32;
    #password = new PasswordService();
    #session = new SessionService();
    #revocation = new SessionRevocation();
    #mail = new Mail();

    async requestReset({ email, language }: ForgotPasswordInput){
        const user = await User.findOneBy({ email });
        if(!user) return;

        await PasswordResetToken.delete({ userId: user.id, consumedAt: IsNull() });

        const minutes = config.passwordReset.ttlMinutes;
        const token = randomBytes(this.#tokenBytes).toString('hex');
        await PasswordResetToken.create({
            userId: user.id,
            tokenHash: this.#hashToken(token),
            expiresAt: new Date(Date.now() + minutes * MINUTE_MS),
            consumedAt: null
        }).save();

        await this.#mail.send({
            to: user.email,
            language,
            ...resetCopy[language]({
                url: `${config.webUrl}/reset-password?token=${token}`,
                minutes
            })
        });
    }

    async resetPassword(input: ResetPasswordInput): Promise<Session>{
        const record = await PasswordResetToken.findOne({
            where: { tokenHash: this.#hashToken(input.token), consumedAt: IsNull() }
        });

        if(!record || record.expiresAt < new Date()){
            throw AuthError.InvalidResetToken();
        }

        const user = await findOrThrow(User, { id: record.userId }, AuthError.InvalidResetToken);

        user.passwordHash = await this.#password.hash(input.newPassword);
        user.emailVerifiedAt = new Date();
        await user.save();
        await this.#revocation.revoke(user.id);

        record.consumedAt = new Date();
        await record.save();

        return this.#session.create(user);
    }

    #hashToken(token: string): string{
        return createHash('sha256').update(token).digest('hex');
    }
}
