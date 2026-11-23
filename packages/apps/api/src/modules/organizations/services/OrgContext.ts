import User from '@/modules/user/models/User';
import { createOrgContext } from '@readable/http/org-context';
import { defaultOrganizationId } from './DefaultOrganization';
import { config } from '@/shared/config';

const context = createOrgContext(async (userId) => {
    const user = await User.findOne({ where: { id: userId }, select: { activeOrgId: true } });
    return user?.activeOrgId ?? await defaultOrganizationId();
}, config.organization.contextTtlMs);

export const forgetOrgContext = context.forget;
export const orgContext = { of: context.of };
