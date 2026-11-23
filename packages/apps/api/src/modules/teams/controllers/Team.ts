import TeamService from '../services/Team';
import AuthenticatedController from '@readable/auth/AuthenticatedController';
import { CurrentUser } from '@readable/auth/CurrentUser';
import { Controller } from '@readable/decorators/controllers/Controller';
import { Body, IdParam } from '@readable/decorators/controllers/RequestParams';
import { Route } from '@readable/decorators/controllers/Route';
import { Status } from '@readable/decorators/controllers/Status';
import { Middleware } from '@readable/decorators/middleware/Middleware';
import { CreateTeamInput, UpdateTeamInput } from '@omni/contracts/team/http';
import { teamRoutes } from '@omni/contracts/team/routes';
import { TeamAdminRoute } from '../middlewares/TeamAdminRoute';
import { TeamMemberRoute } from '../middlewares/TeamMemberRoute';

@Controller('')
export default class TeamController extends AuthenticatedController{
    #service = new TeamService();

    @Route(teamRoutes.mine)
    listMine(@CurrentUser() userId: string){
        return this.#service.listForUser(userId);
    }

    @Route(teamRoutes.create)
    @Status(201)
    create(@CurrentUser() userId: string, @Body() body: CreateTeamInput){
        return this.#service.create(userId, body);
    }

    @Route(teamRoutes.get)
    @Middleware(TeamMemberRoute)
    get(@IdParam('teamId') teamId: string){
        return this.#service.get(teamId);
    }

    @Route(teamRoutes.update)
    @Middleware(TeamAdminRoute)
    update(@IdParam('teamId') teamId: string, @Body() body: UpdateTeamInput){
        return this.#service.update(teamId, body);
    }

    @Route(teamRoutes.remove)
    @Middleware(TeamAdminRoute)
    remove(@CurrentUser() userId: string, @IdParam('teamId') teamId: string){
        return this.#service.remove(userId, teamId);
    }
}
