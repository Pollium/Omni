import { OAuthError } from '../contracts/domain/errors';
import { MicrosoftIdTokenClaims, OAuthProfile, OAuthProviderName } from '../contracts/domain/oauth';
import OAuthProvider from './OAuthProvider';
import { config } from '@/shared/config';
import { MicrosoftEntraId, decodeIdToken } from 'arctic';

const SCOPES = ['openid', 'profile', 'email'];
const VERIFIED_FLAGS = new Set<unknown>([true, 'true', '1']);

export default class MicrosoftProvider extends OAuthProvider{
    readonly name = OAuthProviderName.Microsoft;

    getAuthorizationUrl(state: string, codeVerifier: string): string{
        return this.#client().createAuthorizationURL(state, codeVerifier, SCOPES).toString();
    }

    async exchangeCode(code: string, codeVerifier: string): Promise<OAuthProfile>{
        let claims: MicrosoftIdTokenClaims;
        try{
            const tokens = await this.#client().validateAuthorizationCode(code, codeVerifier);
            claims = decodeIdToken(tokens.idToken()) as MicrosoftIdTokenClaims;
        }catch{
            throw OAuthError.ExchangeFailed();
        }

        if(!claims.email) throw OAuthError.EmailNotProvided();

        const emailVerified = VERIFIED_FLAGS.has(claims.email_verified) || VERIFIED_FLAGS.has(claims.xms_edov);
        if(!emailVerified) throw OAuthError.EmailNotVerified();

        return {
            provider: this.name,
            providerAccountId: claims.sub,
            email: claims.email,
            emailVerified,
            name: claims.name ?? '',
            avatarUrl: null
        };
    }

    #client(): MicrosoftEntraId{
        if(!this.configured) throw OAuthError.NotConfigured();

        const { tenant, clientId, clientSecret } = config.oauth.microsoft;
        return new MicrosoftEntraId(tenant, clientId, clientSecret, this.callbackUrl);
    }
}
