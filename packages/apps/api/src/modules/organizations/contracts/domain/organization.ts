import Organization from '../../models/Organization';
import { OrganizationRole } from '@omni/contracts/organization/domain';

export interface OrganizationWithRole extends Organization{
    role: OrganizationRole;
}
