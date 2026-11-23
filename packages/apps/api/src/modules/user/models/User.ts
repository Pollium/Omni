import BaseModel from '@readable/models/BaseModel';
import { Hidden } from '@readable/models/Hidden';
import { Entity, Column } from 'typeorm';

@Entity()
export default class User extends BaseModel{
    @Column('varchar')
    fullName!: string;

    @Column({
        type: 'varchar',
        unique: true
    })
    username!: string;

    @Column({
        type: 'varchar',
        unique: true
    })
    email!: string;

    @Column('text')
    bio!: string;

    @Column({
        type: 'varchar',
        nullable: true
    })
    @Hidden()
    passwordHash!: string | null;

    @Column({
        type: 'varchar',
        nullable: true
    })
    avatarUrl!: string | null;

    @Column({
        type: 'varchar',
        nullable: true
    })
    phone!: string | null;

    @Column({
        type: 'uuid',
        nullable: true
    })
    activeOrgId!: string | null;

    @Column({
        type: 'varchar',
        array: true,
        default: '{}'
    })
    @Hidden()
    roles!: string[];

    @Column({
        type: 'varchar',
        nullable: true
    })
    @Hidden()
    signupSource!: string | null;

    @Column({
        type: 'varchar',
        nullable: true
    })
    @Hidden()
    signupCampaign!: string | null;

    @Column({
        type: Date,
        nullable: true
    })
    @Hidden()
    emailVerifiedAt!: Date | null;
}
