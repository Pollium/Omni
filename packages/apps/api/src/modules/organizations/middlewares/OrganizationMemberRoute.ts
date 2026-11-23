import OrganizationMembership from '../models/OrganizationMembership';
import { ParamGuardRoute } from '@readable/auth/ParamGuardRoute';
import { findOrThrow } from '@readable/utils/models/find-or-throw';
import { OrganizationError } from '../contracts/domain/errors';

export const OrganizationMemberRoute = ParamGuardRoute('orgId', (orgId, userId) =>
    findOrThrow(OrganizationMembership, { orgId, userId }, OrganizationError.NotAMember));
