import InvitationService from '../services/Invitation';
import BaseController from '@readable/controllers/BaseController';
import { AuthenticatedRoute } from '@readable/auth/AuthenticatedRoute';
import { CurrentUser } from '@readable/auth/CurrentUser';
import { Controller } from '@readable/decorators/controllers/Controller';
import { Body, IdParam, IdQuery, Param } from '@readable/decorators/controllers/RequestParams';
import { Route } from '@readable/decorators/controllers/Route';
import { Status } from '@readable/decorators/controllers/Status';
import { Middleware } from '@readable/decorators/middleware/Middleware';
import { CreateInvitationInput } from '@omni/contracts/invitation/http';
import { invitationRoutes } from '@omni/contracts/invitation/routes';

@Controller('')
export default class InvitationController extends BaseController{
    #service = new InvitationService();

    @Route(invitationRoutes.preview)
    preview(@Param('token') token: string){
        return this.#service.preview(token);
    }

    @Route(invitationRoutes.listForTeam)
    @Middleware(AuthenticatedRoute)
    list(@CurrentUser() userId: string, @IdQuery('teamId') teamId: string){
        return this.#service.listForTeam(userId, teamId);
    }

    @Route(invitationRoutes.create)
    @Middleware(AuthenticatedRoute)
    @Status(201)
    create(@CurrentUser() userId: string, @Body() body: CreateInvitationInput){
        return this.#service.create(userId, body);
    }

    @Route(invitationRoutes.accept)
    @Middleware(AuthenticatedRoute)
    accept(@CurrentUser() userId: string, @Param('token') token: string){
        return this.#service.accept(token, userId);
    }

    @Route(invitationRoutes.revoke)
    @Middleware(AuthenticatedRoute)
    revoke(@CurrentUser() userId: string, @IdParam('invitationId') invitationId: string){
        return this.#service.revoke(userId, invitationId);
    }
}
