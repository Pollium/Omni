import OAuthService from '../services/oauth/OAuth';
import BaseController from '@readable/controllers/BaseController';
import { AuthenticatedRoute } from '@readable/auth/AuthenticatedRoute';
import { CurrentUser } from '@readable/auth/CurrentUser';
import { SessionExpiresAt } from '@readable/auth/SessionExpiresAt';
import { Controller } from '@readable/decorators/controllers/Controller';
import { Body } from '@readable/decorators/controllers/RequestParams';
import { Route } from '@readable/decorators/controllers/Route';
import { Middleware } from '@readable/decorators/middleware/Middleware';
import { HandoffInput } from '@omni/contracts/auth/http';
import { authRoutes } from '@omni/contracts/auth/routes';

@Controller('')
export default class HandoffController extends BaseController{
    #service = new OAuthService();

    @Route(authRoutes.handoff)
    @Middleware(AuthenticatedRoute)
    async issue(@CurrentUser() userId: string, @SessionExpiresAt() expiresAt: number, @Body() body: HandoffInput){
        return { code: await this.#service.issue(userId, expiresAt, body.challenge) };
    }
}
