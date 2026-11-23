import BaseModel from '@readable/models/BaseModel';
import { Fk } from '@readable/models/Fk';
import { Hidden } from '@readable/models/Hidden';
import { Entity, Column, Index } from 'typeorm';

@Entity()
@Index(['userId'])
@Index(['tokenHash'])
export default class PasswordResetToken extends BaseModel{
    @Fk('User', { onDelete: 'CASCADE' })
    userId!: string;

    @Column('varchar')
    @Hidden()
    tokenHash!: string;

    @Column({
        type: Date
    })
    expiresAt!: Date;

    @Column({
        type: Date,
        nullable: true
    })
    consumedAt!: Date | null;
}
    