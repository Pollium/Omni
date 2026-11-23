import BaseModel from '@readable/models/BaseModel';
import { Fk } from '@readable/models/Fk';
import { TeamProfile } from '@omni/contracts/team/domain';
import { Entity, Column, Index } from 'typeorm';

@Entity()
@Index(['orgId'])
export default class Team extends BaseModel implements TeamProfile{
    @Fk('Organization', { onDelete: 'CASCADE' })
    orgId!: string;

    @Column('varchar')
    name!: string;

    @Column('text')
    description!: string;

    @Fk('User', { onDelete: 'SET NULL', nullable: true })
    createdBy!: string | null;
}
