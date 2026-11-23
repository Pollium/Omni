import { OrganizationProfile, OrganizationRole } from './domain';

export type CreateOrganizationInput = OrganizationProfile;

export type UpdateOrganizationInput = Partial<OrganizationProfile>;

export interface AddMemberInput{
    userId: string;
    role?: OrganizationRole;
}

export interface UpdateMemberRoleInput{
    role: OrganizationRole;
}
