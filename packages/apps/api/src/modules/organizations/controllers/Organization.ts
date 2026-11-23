import TeamService from '@/modules/teams/services/Team';
import OrganizationService from '../services/Organization';
import AuthenticatedController from '@readable/auth/AuthenticatedController';
import { CurrentUser } from '@readable/auth/CurrentUser';
import { Controller } from '@readable/decorators/controllers/Controller';
import { Body, IdParam } from '@readable/decorators/controllers/RequestParams';
import { Route } from '@readable/decorators/controllers/Route';
import { Status } from '@readable/decorators/controllers/Status';
import { Middleware } from '@readable/decorators/middleware/Middleware';
import { CreateOrganizationInput, UpdateOrganizationInput } from '@omni/contracts/organization/http';
import { organizationRoutes } from '@omni/contracts/organization/routes';
import { OrganizationAdminRoute } from '../middlewares/OrganizationAdminRoute';
import { OrganizationMemberRoute } from '../middlewares/OrganizationMemberRoute';

@Controller('')
export default class OrganizationController extends AuthenticatedController{
    #service = new OrganizationService();
    #teams = new TeamService();

    @Route(organizationRoutes.mine)
    listMine(@CurrentUser() userId: string){
        return this.#service.listForUser(userId);
    }

    @Route(organizationRoutes.create)
    @Status(201)
    create(
        @CurrentUser() userId: string, @Body() body: CreateOrganizationInput){
        return this.#service.create(userId, body);
    }

    @Route(organizationRoutes.get)
    @Middleware(OrganizationMemberRoute)
    get(@IdParam('orgId') orgId: string){
        return this.#service.get(orgId);
    }

    @Route(organizationRoutes.update)
    @Middleware(OrganizationAdminRoute)
    update(@IdParam('orgId') orgId: string, @Body() body: UpdateOrganizationInput){
        return this.#service.update(orgId, body);
    }

    @Route(organizationRoutes.remove)
    @Middleware(OrganizationAdminRoute)
    remove(@IdParam('orgId') orgId: string){
        return this.#service.remove(orgId);
    }

    @Route(organizationRoutes.listTeams)
    @Middleware(OrganizationAdminRoute)
    listTeams(@IdParam('orgId') orgId: string){
        return this.#teams.listForOrg(orgId);
    }
}
