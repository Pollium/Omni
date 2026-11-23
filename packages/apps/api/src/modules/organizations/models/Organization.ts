import BaseModel from '@readable/models/BaseModel';
import { Fk } from '@readable/models/Fk';
import { OrganizationProfile } from '@omni/contracts/organization/domain';
import { Entity, Column, Index } from 'typeorm';

@Entity()
@Index('org_single_default', ['isDefault'], { unique: true, where: '"isDefault" = true' })
export default class Organization extends BaseModel implements OrganizationProfile{
    @Column('varchar')
    name!: string;

    @Column('text')
    description!: string;

    @Column('varchar')
    website!: string;

    @Column({
        type: 'boolean',
        default: false
    })
    isDefault!: boolean;

    @Fk('User', { onDelete: 'SET NULL', nullable: true })
    createdBy!: string | null;
}
