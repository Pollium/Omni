import { OAuthError } from '../contracts/domain/errors';
import { GitHubEmail, GitHubProfile, OAuthProfile, OAuthProviderName } from '../contracts/domain/oauth';
import OAuthProvider from './OAuthProvider';
import { config } from '@/shared/config';
import { GitHub } from 'arctic';

const SCOPES = ['read:user', 'user:email'];
const API = 'https://api.github.com';

export default class GitHubProvider extends OAuthProvider{
    readonly name = OAuthProviderName.GitHub;

    getAuthorizationUrl(state: string): string{
        return this.#client().createAuthorizationURL(state, SCOPES).toString();
    }

    async exchangeCode(code: string): Promise<OAuthProfile>{
        let accessToken: string;
        try{
            const tokens = await this.#client().validateAuthorizationCode(code);
            accessToken = tokens.accessToken();
        }catch{
            throw OAuthError.ExchangeFailed();
        }

        const profile = await this.#get<GitHubProfile>('/user', accessToken);

        return {
            provider: this.name,
            providerAccountId: String(profile.id),
            email: await this.#primaryEmail(accessToken),
            emailVerified: true,
            name: profile.name ?? profile.login,
            avatarUrl: profile.avatar_url ?? null
        };
    }

    async #primaryEmail(accessToken: string): Promise<string>{
        const emails = await this.#get<GitHubEmail[]>('/user/emails', accessToken);
        const verified = emails.find((entry) => entry.primary && entry.verified)
            ?? emails.find((entry) => entry.verified);
        if(!verified) throw OAuthError.EmailNotProvided();
        return verified.email;
    }

    async #get<T>(path: string, accessToken: string): Promise<T>{
        const response = await fetch(`${API}${path}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github+json',
                'User-Agent': 'omni'
            }
        });
        if(!response.ok) throw OAuthError.ExchangeFailed();
        return response.json() as Promise<T>;
    }

    #client(): GitHub{
        if(!this.configured) throw OAuthError.NotConfigured();

        const { clientId, clientSecret } = config.oauth.github;
        return new GitHub(clientId, clientSecret, this.callbackUrl);
    }
}
