import { BaseEntity } from '../shared/base';
import { PublicUserSummary } from '../user/domain';

export interface TeamProfile{
    /**
     * @minLength 1
     * @maxLength 120
     */
    name: string;
    description: string;
}

export interface Team extends TeamProfile, BaseEntity{
    orgId: string;
    createdBy: string | null;
}

export enum TeamRole{
    Owner = 'owner',
    Admin = 'admin',
    Member = 'member'
}

export interface TeamWithRole extends Team{
    role: TeamRole;
}

export interface TeamMembership extends BaseEntity{
    teamId: string;
    userId: string;
    role: TeamRole;
}

export interface TeamMember extends PublicUserSummary{
    membershipId: string;
    role: TeamRole;
    joinedAt: string;
}

export interface OrgTeam extends Team{
    memberCount: number;
}
