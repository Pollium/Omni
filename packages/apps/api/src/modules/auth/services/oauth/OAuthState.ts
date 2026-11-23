import { redis } from '@readable/redis/RedisClient';
import { OAuthError } from '../../contracts/domain/errors';
import { OAuthAttribution, OAuthProviderName, OAuthStateIssue, OAuthStateRecord } from '../../contracts/domain/oauth';
import { config } from '@/shared/config';
import { randomBytes } from 'node:crypto';

export default class OAuthStateService{
    async issue(
        provider: OAuthProviderName,
        app: string,
        attribution: OAuthAttribution,
        handoffChallenge: string
    ): Promise<OAuthStateIssue>{
        const state = randomBytes(32).toString('base64url');
        const codeVerifier = randomBytes(32).toString('base64url');
        const record: OAuthStateRecord = { codeVerifier, handoffChallenge, app, ...attribution };
        await redis.set(this.#key(provider, state), JSON.stringify(record), 'EX', config.oauth.stateTtlSeconds);
        return {
            state,
            codeVerifier
        };
    }

    async consume(provider: OAuthProviderName, state: string): Promise<OAuthStateRecord>{
        const raw = state ? await redis.getdel(this.#key(provider, state)) : null;
        if(raw === null) throw OAuthError.StateMismatch();
        return JSON.parse(raw) as OAuthStateRecord;
    }

    #key(provider: OAuthProviderName, state: string): string{
        return `oauth:state:${provider}:${state}`;
    }
}
