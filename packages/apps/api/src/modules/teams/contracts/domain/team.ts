import Team from '../../models/Team';
import { TeamRole } from '@omni/contracts/team/domain';

export interface TeamWithRole extends Team{
    role: TeamRole;
}

export interface OrgTeamView extends Team{
    memberCount: number;
}
