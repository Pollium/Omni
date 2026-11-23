import BaseModel from '@readable/models/BaseModel';
import { Fk } from '@readable/models/Fk';
import { OAuthProviderName } from '../contracts/domain/oauth';
import { Entity, Column, Index, Unique } from 'typeorm';

@Entity()
@Unique(['provider', 'providerAccountId'])
@Index(['userId'])
export default class OAuthAccount extends BaseModel{
    @Fk('User', { onDelete: 'CASCADE' })
    userId!: string;

    @Column({
        type: 'simple-enum',
        enum: OAuthProviderName
    })
    provider!: OAuthProviderName;

    @Column('varchar')
    providerAccountId!: string;
}
