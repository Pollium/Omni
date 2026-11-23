import Team from './Team';
import BaseModel from '@readable/models/BaseModel';
import { Fk } from '@readable/models/Fk';
import { TeamRole } from '@omni/contracts/team/domain';
import { Entity, Column, Unique } from 'typeorm';

@Entity()
@Unique(['teamId', 'userId'])
export default class TeamMembership extends BaseModel{
    @Fk('Team', { onDelete: 'CASCADE' })
    teamId!: string;

    team!: Team;

    @Fk('User', { onDelete: 'CASCADE' })
    userId!: string;

    @Column({
        type: 'simple-enum',
        enum: TeamRole,
        default: TeamRole.Member
    })
    role!: TeamRole;
}
