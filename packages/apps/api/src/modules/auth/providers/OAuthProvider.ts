import { OAuthProfile, OAuthProviderName } from '../contracts/domain/oauth';
import { config } from '@/shared/config';

export default abstract class OAuthProvider{
    abstract readonly name: OAuthProviderName;

    abstract getAuthorizationUrl(state: string, codeVerifier: string): string;

    abstract exchangeCode(code: string, codeVerifier: string): Promise<OAuthProfile>;

    get configured(): boolean{
        const { clientId, clientSecret } = config.oauth[this.name];

        return clientId !== '' && clientSecret !== '';
    }

    protected get callbackUrl(): string{
        return `${config.webUrl}/auth/oauth/${this.name}/callback`;
    }
}
