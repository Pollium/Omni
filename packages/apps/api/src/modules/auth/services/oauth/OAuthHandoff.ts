import { answersChallenge } from '@readable/auth/pkce';
import { redis } from '@readable/redis/RedisClient';
import { HandoffRecord, Session } from '../../contracts/domain/auth';
import { OAuthError } from '../../contracts/domain/errors';
import { config } from '@/shared/config';
import { randomBytes } from 'node:crypto';

export default class OAuthHandoffService{
    async issue(session: Session, challenge: string): Promise<string>{
        const code = randomBytes(32).toString('base64url');
        const record: HandoffRecord = { session, challenge };
        await redis.set(this.#key(code), JSON.stringify(record), 'EX', config.oauth.handoffTtlSeconds);
        return code;
    }

    async consume(code: string, verifier: string): Promise<Session>{
        const raw = code ? await redis.getdel(this.#key(code)) : null;
        if(raw === null) throw OAuthError.InvalidHandoffCode();

        const { session, challenge } = JSON.parse(raw) as HandoffRecord;
        if(!answersChallenge(challenge, verifier)) throw OAuthError.InvalidHandoffCode();
        return session;
    }

    #key(code: string): string{
        return `oauth:handoff:${code}`;
    }
}
