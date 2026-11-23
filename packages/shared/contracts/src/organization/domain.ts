import { BaseEntity } from '../shared/base';
import { PublicUserSummary } from '../user/domain';

export interface OrganizationProfile{
    /**
     * @minLength 1
     * @maxLength 120
     */
    name: string;
    /** @maxLength 500 */
    description: string;
    /** @maxLength 200 */
    website: string;
}

export interface Organization extends OrganizationProfile, BaseEntity{
    isDefault: boolean;
    createdBy: string | null;
}

export enum OrganizationRole{
    Admin = 'admin',
    Member = 'member'
}

export interface OrganizationWithRole extends Organization{
    role: OrganizationRole;
}

export interface Membership extends BaseEntity{
    orgId: string;
    userId: string;
    role: OrganizationRole;
}

export interface OrganizationMember extends PublicUserSummary{
    membershipId: string;
    role: OrganizationRole;
    joinedAt: string;
}
