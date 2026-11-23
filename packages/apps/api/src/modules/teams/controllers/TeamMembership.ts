import TeamMembershipService from '../services/TeamMembership';
import AuthenticatedController from '@readable/auth/AuthenticatedController';
import { Controller } from '@readable/decorators/controllers/Controller';
import { Body, IdParam } from '@readable/decorators/controllers/RequestParams';
import { Route } from '@readable/decorators/controllers/Route';
import { Middleware } from '@readable/decorators/middleware/Middleware';
import { UpdateTeamMemberRoleInput } from '@omni/contracts/team/http';
import { teamRoutes } from '@omni/contracts/team/routes';
import { TeamAdminRoute } from '../middlewares/TeamAdminRoute';
import { TeamMemberRoute } from '../middlewares/TeamMemberRoute';

@Controller('')
export default class TeamMembershipController extends AuthenticatedController{
    #service = new TeamMembershipService();

    @Route(teamRoutes.listMembers)
    @Middleware(TeamMemberRoute)
    list(@IdParam('teamId') teamId: string){
        return this.#service.list(teamId);
    }

    @Route(teamRoutes.updateMemberRole)
    @Middleware(TeamAdminRoute)
    updateRole(
        @IdParam('teamId') teamId: string,
        @IdParam('userId') userId: string,
        @Body() body: UpdateTeamMemberRoleInput
    ){
        return this.#service.updateRole(teamId, userId, body);
    }

    @Route(teamRoutes.removeMember)
    @Middleware(TeamAdminRoute)
    remove(@IdParam('teamId') teamId: string, @IdParam('userId') userId: string){
        return this.#service.remove(teamId, userId);
    }
}
