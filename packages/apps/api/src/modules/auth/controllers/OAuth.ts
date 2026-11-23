import OAuthService from '../services/oauth/OAuth';
import BaseController from '@readable/controllers/BaseController';
import RedirectResponse from '@readable/controllers/responses/Redirect';
import { Controller } from '@readable/decorators/controllers/Controller';
import { Param, Query, Body } from '@readable/decorators/controllers/RequestParams';
import { Route } from '@readable/decorators/controllers/Route';
import { ExchangeCodeInput } from '@omni/contracts/auth/http';
import { authRoutes } from '@omni/contracts/auth/routes';

@Controller('')
export default class OAuthController extends BaseController{
    #service = new OAuthService();

    @Route(authRoutes.oauthStart)
    async start(
        @Param('provider') provider: string,
        @Query('app') app: string | undefined,
        @Query('source') source: string | undefined,
        @Query('campaign') campaign: string | undefined,
        @Query('challenge') challenge: string | undefined
    ){
        const { url } = await this.#service.start(provider, app, {
            source: source ?? null,
            campaign: campaign ?? null
        }, challenge);

        return new RedirectResponse(url);
    }

    @Route(authRoutes.oauthCallback)
    async callback(@Param('provider') provider: string, @Query('code') code: string, @Query('state') state: string){
        return new RedirectResponse(this.#service.callbackUrl(await this.#service.handleCallback(provider, code, state)));
    }

    @Route(authRoutes.oauthExchange)
    exchange(@Body() body: ExchangeCodeInput){
        return this.#service.exchange(body.code, body.verifier);
    }
}
