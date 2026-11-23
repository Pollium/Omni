import BaseModel from '@readable/models/BaseModel';
import { Fk } from '@readable/models/Fk';
import { Hidden } from '@readable/models/Hidden';
import { InvitationStatus } from '@omni/contracts/invitation/domain';
import { TeamRole } from '@omni/contracts/team/domain';
import { Entity, Column, Index } from 'typeorm';

@Entity()
@Index(['tokenHash'], { unique: true })
@Index(['teamId', 'status'])
export default class Invitation extends BaseModel{
    @Fk('Organization', { onDelete: 'CASCADE' })
    orgId!: string;

    @Fk('Team', { onDelete: 'CASCADE' })
    teamId!: string;

    @Column('varchar')
    email!: string;

    @Column('varchar')
    @Hidden()
    tokenHash!: string;

    @Column({
        type: 'simple-enum',
        enum: TeamRole,
        default: TeamRole.Member
    })
    teamRole!: TeamRole;

    @Column({
        type: 'simple-enum',
        enum: InvitationStatus,
        default: InvitationStatus.Pending
    })
    status!: InvitationStatus;

    @Fk('User', { onDelete: 'SET NULL', nullable: true })
    invitedBy!: string | null;

    @Column({
        type: Date
    })
    expiresAt!: Date;
}
