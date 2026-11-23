import MembershipService from '../services/Membership';
import AuthenticatedController from '@readable/auth/AuthenticatedController';
import { Controller } from '@readable/decorators/controllers/Controller';
import { Body, IdParam } from '@readable/decorators/controllers/RequestParams';
import { Route } from '@readable/decorators/controllers/Route';
import { Status } from '@readable/decorators/controllers/Status';
import { Middleware } from '@readable/decorators/middleware/Middleware';
import { AddMemberInput, UpdateMemberRoleInput } from '@omni/contracts/organization/http';
import { organizationRoutes } from '@omni/contracts/organization/routes';
import { OrganizationAdminRoute } from '../middlewares/OrganizationAdminRoute';
import { OrganizationMemberRoute } from '../middlewares/OrganizationMemberRoute';

@Controller('')
export default class MembershipController extends AuthenticatedController{
    #service = new MembershipService();

    @Route(organizationRoutes.listMembers)
    @Middleware(OrganizationMemberRoute)
    list(@IdParam('orgId') orgId: string){
        return this.#service.roster(orgId);
    }

    @Route(organizationRoutes.addMember)
    @Status(201)
    @Middleware(OrganizationAdminRoute)
    add(@IdParam('orgId') orgId: string, @Body() body: AddMemberInput){
        return this.#service.add(orgId, body);
    }

    @Route(organizationRoutes.updateMemberRole)
    @Middleware(OrganizationAdminRoute)
    updateRole(
        @IdParam('orgId') orgId: string, 
        @IdParam('userId') userId: string,
        @Body() body: UpdateMemberRoleInput
    ){
        return this.#service.updateRole(orgId, userId, body);
    }

    @Route(organizationRoutes.removeMember)
    @Middleware(OrganizationAdminRoute)
    remove(
        @IdParam('orgId') orgId: string, 
        @IdParam('userId') userId: string
    ){
        return this.#service.remove(orgId, userId);
    }
}
