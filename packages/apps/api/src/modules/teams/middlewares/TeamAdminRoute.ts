import TeamMembershipService from '../services/TeamMembership';
import { ParamGuardRoute } from '@readable/auth/ParamGuardRoute';

export const assertTeamAdmin = (teamId: string, userId: string) =>
    new TeamMembershipService().assertAdmin(teamId, userId);

export const TeamAdminRoute = ParamGuardRoute('teamId', assertTeamAdmin);
