import GitHubProvider from './GitHubProvider';
import GoogleProvider from './GoogleProvider';
import MicrosoftProvider from './MicrosoftProvider';
import OAuthProvider from './OAuthProvider';
import { OAuthProviderName } from '../contracts/domain/oauth';
import { OAuthError } from '../contracts/domain/errors';

const providers = new Map<OAuthProviderName, OAuthProvider>([
    [OAuthProviderName.Google, new GoogleProvider()],
    [OAuthProviderName.Microsoft, new MicrosoftProvider()],
    [OAuthProviderName.GitHub, new GitHubProvider()]
]);

export const resolveProvider = (name: string): OAuthProvider => {
    const provider = providers.get(name as OAuthProviderName);
    if(!provider) throw OAuthError.UnknownProvider();

    return provider;
};

export const configuredProviders = (): OAuthProviderName[] =>
    [...providers.values()]
        .filter((provider) => provider.configured)
        .map((provider) => provider.name);
