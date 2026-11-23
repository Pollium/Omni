import Organization from '../models/Organization';
import OrganizationMembership from '../models/OrganizationMembership';
import User from '@/modules/user/models/User';
import { userSeed } from '@/modules/user/tests/UserSeed';
import { OrganizationRole } from '@omni/contracts/organization/domain';

export default class OrganizationSeed{
    async memberOf(user?: User, role = OrganizationRole.Member){
        const member = user ?? await userSeed.user();
        const organization = await Organization.create({
            name: 'Org',
            description: '',
            website: '',
            isDefault: false,
            createdBy: member.id
        }).save();

        await this.join(organization.id, member, role);

        return { user: member, organization };
    }

    adminOf(user?: User){
        return this.memberOf(user, OrganizationRole.Admin);
    }

    join(orgId: string, user: User, role = OrganizationRole.Member): Promise<OrganizationMembership>{
        return OrganizationMembership.create({
            orgId,
            userId: user.id,
            role
        }).save();
    }
}

export const organizationSeed = new OrganizationSeed();
