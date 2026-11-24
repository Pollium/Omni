import ConsoleAccounts from '../services/ConsoleAccounts';
import ConsoleDirectory from '../services/ConsoleDirectory';
import ConsoleInstance from '../services/ConsoleInstance';
import ConsoleOverview from '../services/ConsoleOverview';
import ConsoleUsers from '../services/ConsoleUsers';
import AuthenticatedController from '@readable/auth/AuthenticatedController';
import { CurrentUser } from '@readable/auth/CurrentUser';
import { Page } from '@readable/contracts/params';
import { Controller } from '@readable/decorators/controllers/Controller';
import { Body, IdParam, Pagination, Param, Query } from '@readable/decorators/controllers/RequestParams';
import { Route } from '@readable/decorators/controllers/Route';
import { Middleware } from '@readable/decorators/middleware/Middleware';
import { ConsolePasswordResetInput } from '@omni/contracts/console/http';
import { consoleRoutes } from '@omni/contracts/console/routes';
import { AdminRoute } from '../middlewares/AdminRoute';

@Controller('')
@Middleware(AdminRoute)
export default class ConsoleController extends AuthenticatedController{
    #users = new ConsoleUsers();
    #accounts = new ConsoleAccounts();
    #overview = new ConsoleOverview();
    #directory = new ConsoleDirectory();
    #instance = new ConsoleInstance();

    @Route(consoleRoutes.me)
    me(@CurrentUser() userId: string){
        return this.#users.member(userId);
    }

    @Route(consoleRoutes.overview)
    overview(@Query('days') days: string | undefined){
        return this.#overview.get(days);
    }

    @Route(consoleRoutes.users)
    users(
        @Query('q') q: string | undefined,
        @Query('view') view: string | undefined,
        @Query('method') method: string | undefined,
        @Pagination() page: Page
    ){
        return this.#users.list({ q: q?.trim() ?? '', view, method }, page);
    }

    @Route(consoleRoutes.userCounts)
    userCounts(){
        return this.#users.counts();
    }

    @Route(consoleRoutes.user)
    user(@IdParam('userId') userId: string){
        return this.#users.detail(userId);
    }

    @Route(consoleRoutes.grantRole)
    grantRole(@IdParam('userId') userId: string, @Param('role') role: string){
        return this.#accounts.grant(userId, role);
    }

    @Route(consoleRoutes.revokeRole)
    revokeRole(@CurrentUser() adminId: string, @IdParam('userId') userId: string, @Param('role') role: string){
        return this.#accounts.revoke(adminId, userId, role);
    }

    @Route(consoleRoutes.sendPasswordReset)
    sendPasswordReset(@IdParam('userId') userId: string, @Body() body: ConsolePasswordResetInput){
        return this.#accounts.sendPasswordReset(userId, body.language);
    }

    @Route(consoleRoutes.revokeSessions)
    revokeSessions(@IdParam('userId') userId: string){
        return this.#accounts.revokeSessions(userId);
    }

    @Route(consoleRoutes.removeUser)
    removeUser(@CurrentUser() adminId: string, @IdParam('userId') userId: string){
        return this.#accounts.remove(adminId, userId);
    }

    @Route(consoleRoutes.roles)
    roles(){
        return this.#directory.roles();
    }

    @Route(consoleRoutes.organization)
    organization(){
        return this.#directory.organization();
    }

    @Route(consoleRoutes.teams)
    teams(@Pagination() page: Page){
        return this.#directory.teams(page);
    }

    @Route(consoleRoutes.invitations)
    invitations(){
        return this.#directory.invitations();
    }

    @Route(consoleRoutes.apps)
    apps(){
        return this.#instance.apps();
    }

    @Route(consoleRoutes.settings)
    settings(){
        return this.#instance.settings();
    }
}
