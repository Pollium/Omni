import BaseModel from '@readable/models/BaseModel';
import { Fk } from '@readable/models/Fk';
import { Hidden } from '@readable/models/Hidden';
import { Entity, Column, Index } from 'typeorm';

@Entity()
@Index(['userId'], { unique: true })
export default class Avatar extends BaseModel{
    @Fk('User', { onDelete: 'CASCADE' })
    userId!: string;

    @Column('varchar')
    contentType!: string;

    @Column('bytea')
    @Hidden()
    bytes!: Buffer;
}
