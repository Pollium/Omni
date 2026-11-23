import { defineErrors } from '@readable/utils/errors/define-errors';
import { OrganizationErrors } from '@omni/contracts/organization/errors';

export const OrganizationError = defineErrors(OrganizationErrors);
