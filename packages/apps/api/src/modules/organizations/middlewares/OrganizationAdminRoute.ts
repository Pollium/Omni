import OrganizationMembership from '../models/OrganizationMembership';
import { ParamGuardRoute } from '@readable/auth/ParamGuardRoute';
import { findOrThrow } from '@readable/utils/models/find-or-throw';
import { OrganizationRole } from '@omni/contracts/organization/domain';
import { OrganizationError } from '../contracts/domain/errors';

export const assertOrgAdmin = async (orgId: string, userId: string) => {
    const membership = await findOrThrow(OrganizationMembership, { orgId, userId }, OrganizationError.NotAMember);
    if(membership.role !== OrganizationRole.Admin){
        throw OrganizationError.Forbidden();
    }
};

export const OrganizationAdminRoute = ParamGuardRoute('orgId', assertOrgAdmin);
