import User from '@/modules/user/models/User';
import SignupService from '@/modules/user/services/account/Signup';
import OAuthAccount from '../../models/OAuthAccount';
import SessionService from '../session/Session';
import OAuthHandoffService from './OAuthHandoff';
import OAuthStateService from './OAuthState';
import { findOrThrow } from '@readable/utils/models/find-or-throw';
import { Session } from '../../contracts/domain/auth';
import { OAuthError } from '../../contracts/domain/errors';
import { OAuthAttribution, OAuthHandoff, OAuthProfile, OAuthStartResult } from '../../contracts/domain/oauth';
import { resolveProvider } from '../../providers/registry';
import { config } from '@/shared/config';

const HANDOFF_CHALLENGE = /^[A-Za-z0-9_-]{43}$/;

export default class OAuthService{
    #state = new OAuthStateService();
    #handoff = new OAuthHandoffService();
    #session = new SessionService();
    #signup = new SignupService();

    async start(
        providerName: string,
        app: string | undefined,
        attribution: OAuthAttribution,
        handoffChallenge: string | undefined
    ): Promise<OAuthStartResult>{
        if(handoffChallenge === undefined || !HANDOFF_CHALLENGE.test(handoffChallenge)) throw OAuthError.InvalidHandoffChallenge();

        const provider = resolveProvider(providerName);
        const { state, codeVerifier } = await this.#state.issue(provider.name, this.#appOf(app), attribution, handoffChallenge);
        return { url: provider.getAuthorizationUrl(state, codeVerifier) };
    }

    async handleCallback(providerName: string, code: string, state: string): Promise<OAuthHandoff>{
        const provider = resolveProvider(providerName);
        const { codeVerifier, handoffChallenge, app, source, campaign } = await this.#state.consume(provider.name, state);
        const profile = await provider.exchangeCode(code, codeVerifier);
        const user = await this.#findOrCreateUser(profile, { source, campaign });
        return {
            code: await this.#handoff.issue(this.#session.create(user), handoffChallenge),
            app
        };
    }

    async exchange(code: string, verifier: string): Promise<Session>{
        return this.#handoff.consume(code, verifier);
    }

    async issue(userId: string, expiresAt: number, challenge: string): Promise<string>{
        const user = await findOrThrow(User, { id: userId }, OAuthError.InvalidHandoffCode);
        return this.#handoff.issue(this.#session.renew(user, expiresAt), challenge);
    }

    callbackUrl(handoff: OAuthHandoff): string{
        const url = new URL(`${config.webUrl}/auth/callback`);
        url.searchParams.set('code', handoff.code);
        url.searchParams.set('app', handoff.app);
        return url.toString();
    }

    #appOf(value: string | undefined): string{
        const app = [...config.apps, config.console.app].find((candidate) => candidate.id === value) ?? config.home;

        return app.id;
    }

    async #findOrCreateUser(profile: OAuthProfile, attribution: OAuthAttribution): Promise<User>{
        const account = await OAuthAccount.findOneBy({
            provider: profile.provider,
            providerAccountId: profile.providerAccountId
        });
        if(account){
            return this.#confirmEmail(await findOrThrow(User, { id: account.userId }, OAuthError.ExchangeFailed), profile);
        }

        if(!profile.emailVerified) throw OAuthError.EmailNotVerified();

        const existing = await User.findOneBy({ email: profile.email });
        if(existing){
            if(existing.emailVerifiedAt === null) throw OAuthError.EmailNotProven();
            await this.#link(existing.id, profile);
            return existing;
        }

        return this.#createUser(profile, attribution);
    }

    async #confirmEmail(user: User, profile: OAuthProfile): Promise<User>{
        if(user.emailVerifiedAt !== null || !profile.emailVerified || profile.email !== user.email) return user;

        user.emailVerifiedAt = new Date();
        return user.save();
    }

    async #createUser(profile: OAuthProfile, attribution: OAuthAttribution): Promise<User>{
        const username = await this.#deriveUsername(profile);
        const user = await User.create({
            fullName: profile.name.trim() || username,
            username,
            email: profile.email,
            bio: '',
            phone: null,
            passwordHash: null,
            avatarUrl: null,
            roles: [],
            emailVerifiedAt: new Date(),
            signupSource: attribution.source,
            signupCampaign: attribution.campaign
        }).save();

        await this.#link(user.id, profile);
        await this.#signup.welcome(user, profile.avatarUrl);

        return user;
    }

    async #link(userId: string, profile: OAuthProfile){
        await OAuthAccount.create({
            userId,
            provider: profile.provider,
            providerAccountId: profile.providerAccountId
        }).save();
    }

    async #deriveUsername(profile: OAuthProfile): Promise<string>{
        const base = (profile.name.trim() || profile.email.split('@')[0]).slice(0, 32);

        let candidate = base;
        let attempt = 1;
        while(await User.findOneBy({ username: candidate })){
            attempt += 1;
            const suffix = String(attempt);
            candidate = `${base.slice(0, 32 - suffix.length)}${suffix}`;
        }
        return candidate;
    }
}
