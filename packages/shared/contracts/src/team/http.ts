import { TeamProfile, TeamRole } from './domain';

export type CreateTeamInput = TeamProfile;

export type UpdateTeamInput = Partial<TeamProfile>;

export interface UpdateTeamMemberRoleInput{
    role: TeamRole.Admin | TeamRole.Member;
}
