import TeamMembershipService from '../services/TeamMembership';
import { ParamGuardRoute } from '@readable/auth/ParamGuardRoute';

export const TeamMemberRoute = ParamGuardRoute('teamId', (teamId, userId) =>
    new TeamMembershipService().assertMember(teamId, userId));
