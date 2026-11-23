import MembershipService from '@/modules/organizations/services/Membership';
import OrganizationService from '@/modules/organizations/services/Organization';
import TeamService from '@/modules/teams/services/Team';
import TeamMembershipService from '@/modules/teams/services/TeamMembership';
import DirectoryLookup from '../services/DirectoryLookup';
import BaseController from '@readable/controllers/BaseController';
import { Controller } from '@readable/decorators/controllers/Controller';
import { Body, IdParam, Param, Query } from '@readable/decorators/controllers/RequestParams';
import { Route } from '@readable/decorators/controllers/Route';
import { Middleware } from '@readable/decorators/middleware/Middleware';
import { ServiceKeyRoute } from '@readable/http/ServiceKeyRoute';
import { DirectorySummariesInput } from '@omni/contracts/directory/http';
import { directoryRoutes } from '@omni/contracts/directory/routes';
import { defaultOrganizationId } from '@/modules/organizations/services/DefaultOrganization';
import { config } from '@/shared/config';

@Controller('')
@Middleware(ServiceKeyRoute(config.serviceKeyHeader, config.serviceKey))
export default class DirectoryController extends BaseController{
    #orgs = new OrganizationService();
    #orgMembers = new MembershipService();
    #teams = new TeamService();
    #teamMembers = new TeamMembershipService();
    #users = new DirectoryLookup();

    @Route(directoryRoutes.defaultOrg)
    async defaultOrg(){
        return { orgId: await defaultOrganizationId() };
    }

    @Route(directoryRoutes.organizations)
    organizations(){
        return this.#orgs.list();
    }

    @Route(directoryRoutes.organization)
    organization(@IdParam('orgId') orgId: string){
        return this.#orgs.get(orgId);
    }

    @Route(directoryRoutes.orgMembers)
    orgMembers(@IdParam('orgId') orgId: string){
        return this.#orgMembers.list(orgId);
    }

    @Route(directoryRoutes.user)
    user(@IdParam('userId') userId: string){
        return this.#users.user(userId);
    }

    @Route(directoryRoutes.users)
    users(){
        return this.#users.users();
    }

    @Route(directoryRoutes.searchUsers)
    searchUsers(@Query('q') q: string | undefined, @Query('withoutRole') withoutRole: string | undefined){
        return this.#users.search(q?.trim() ?? '', withoutRole ?? '');
    }

    @Route(directoryRoutes.removeUser)
    removeUser(@IdParam('userId') userId: string){
        return this.#users.remove(userId);
    }

    @Route(directoryRoutes.userAccount)
    userAccount(@IdParam('userId') userId: string){
        return this.#users.account(userId);
    }

    @Route(directoryRoutes.userByUsername)
    userByUsername(@Param('username') username: string){
        return this.#users.byUsername(username);
    }

    @Route(directoryRoutes.userSummaries)
    userSummaries(@Body() body: DirectorySummariesInput){
        return this.#users.summaries(body.userIds);
    }

    @Route(directoryRoutes.userCensus)
    userCensus(@Query('days') days: string | undefined){
        return this.#users.census(days);
    }

    @Route(directoryRoutes.usersWithRole)
    usersWithRole(@Param('role') role: string){
        return this.#users.holders(role);
    }

    @Route(directoryRoutes.grantRole)
    grantRole(@IdParam('userId') userId: string, @Param('role') role: string){
        return this.#users.grant(userId, role);
    }

    @Route(directoryRoutes.revokeRole)
    revokeRole(@IdParam('userId') userId: string, @Param('role') role: string){
        return this.#users.revoke(userId, role);
    }

    @Route(directoryRoutes.team)
    team(@IdParam('teamId') teamId: string){
        return this.#teams.get(teamId);
    }

    @Route(directoryRoutes.teamMembers)
    teamMembers(@IdParam('teamId') teamId: string){
        return this.#teamMembers.list(teamId);
    }

    @Route(directoryRoutes.userTeams)
    userTeams(@IdParam('userId') userId: string){
        return this.#teams.listForUser(userId);
    }
}
