import Organization from '@/modules/organizations/models/Organization';
import Team from '../models/Team';
import TeamMembership from '../models/TeamMembership';
import User from '@/modules/user/models/User';
import { userSeed } from '@/modules/user/tests/UserSeed';
import { TeamRole } from '@omni/contracts/team/domain';

export default class TeamSeed{
    async ownedTeam(user?: User){
        const owner = user ?? await userSeed.user();
        const organization = await Organization.create({
            name: 'Org',
            description: '',
            website: '',
            isDefault: false,
            createdBy: owner.id
        }).save();

        const team = await Team.create({
            orgId: organization.id,
            name: `${owner.fullName}'s Team`,
            description: '',
            createdBy: owner.id
        }).save();

        await this.join(team.id, owner, TeamRole.Owner);

        return { user: owner, organization, team };
    }

    join(teamId: string, user: User, role = TeamRole.Member): Promise<TeamMembership>{
        return TeamMembership.create({
            teamId,
            userId: user.id,
            role
        }).save();
    }
}

export const teamSeed = new TeamSeed();
