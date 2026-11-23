import { OAuthError } from '../contracts/domain/errors';
import { OAuthProfile, OAuthProviderName, OidcIdTokenClaims } from '../contracts/domain/oauth';
import OAuthProvider from './OAuthProvider';
import { config } from '@/shared/config';
import { Google, decodeIdToken } from 'arctic';

const SCOPES = ['openid', 'email', 'profile'];

export default class GoogleProvider extends OAuthProvider{
    readonly name = OAuthProviderName.Google;

    getAuthorizationUrl(state: string, codeVerifier: string): string{
        return this.#client().createAuthorizationURL(state, codeVerifier, SCOPES).toString();
    }

    async exchangeCode(code: string, codeVerifier: string): Promise<OAuthProfile>{
        let claims: OidcIdTokenClaims;
        try{
            const tokens = await this.#client().validateAuthorizationCode(code, codeVerifier);
            claims = decodeIdToken(tokens.idToken()) as OidcIdTokenClaims;
        }catch{
            throw OAuthError.ExchangeFailed();
        }

        if(!claims.email) throw OAuthError.EmailNotProvided();

        return {
            provider: this.name,
            providerAccountId: claims.sub,
            email: claims.email,
            emailVerified: claims.email_verified === true || claims.email_verified === 'true',
            name: claims.name ?? '',
            avatarUrl: claims.picture ?? null
        };
    }

    #client(): Google{
        if(!this.configured) throw OAuthError.NotConfigured();

        const { clientId, clientSecret } = config.oauth.google;
        return new Google(clientId, clientSecret, this.callbackUrl);
    }
}
