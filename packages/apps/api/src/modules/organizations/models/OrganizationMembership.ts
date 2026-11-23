import Organization from './Organization';
import BaseModel from '@readable/models/BaseModel';
import { Fk } from '@readable/models/Fk';
import { OrganizationRole } from '@omni/contracts/organization/domain';
import { Entity, Column, Unique } from 'typeorm';

@Entity()
@Unique(['orgId', 'userId'])
export default class OrganizationMembership extends BaseModel{
    @Fk('Organization', { onDelete: 'CASCADE' })
    orgId!: string;

    org!: Organization;

    @Fk('User', { onDelete: 'CASCADE' })
    userId!: string;

    @Column({
        type: 'simple-enum',
        enum: OrganizationRole,
        default: OrganizationRole.Member
    })
    role!: OrganizationRole;
}
