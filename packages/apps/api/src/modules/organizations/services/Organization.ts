import Organization from '../models/Organization';
import OrganizationMembership from '../models/OrganizationMembership';
import MembershipService from './Membership';
import Team from '@/modules/teams/models/Team';
import User from '@/modules/user/models/User';
import Webhooks from '@/modules/webhooks/services/Webhooks';
import { findOrThrow } from '@readable/utils/models/find-or-throw';
import { CreateOrganizationInput, UpdateOrganizationInput } from '@omni/contracts/organization/http';
import { OrganizationError } from '../contracts/domain/errors';
import { OrganizationWithRole } from '../contracts/domain/organization';
import { forgetOrgContext } from './OrgContext';

export default class OrganizationService{
    #webhooks = new Webhooks();

    list(): Promise<Organization[]>{
        return Organization.find({ order: { id: 'ASC' } });
    }

    async listForUser(userId: string): Promise<OrganizationWithRole[]>{
        const memberships = await OrganizationMembership.find({
            where: { userId },
            relations: { org: true },
            order: { id: 'ASC' }
        });
        return memberships.map((membership) =>
            Object.assign(membership.org, { role: membership.role }));
    }

    async create(userId: string, input: CreateOrganizationInput): Promise<Organization>{
        const organization = await Organization.create({
            ...input,
            isDefault: false,
            createdBy: userId
        }).save();

        const memberships = new MembershipService();
        await memberships.provisionAdmin(organization.id, userId);

        await this.#webhooks.publish('organization.created', {
            orgId: organization.id,
            createdBy: userId
        });

        return organization;
    }

    async get(orgId: string): Promise<Organization>{
        const organization = await findOrThrow(Organization, { id: orgId }, OrganizationError.NotFound);
        return organization;
    }

    async update(orgId: string, patch: UpdateOrganizationInput): Promise<Organization>{
        const organization = await this.get(orgId);
        return Object.assign(organization, patch).save();
    }

    async remove(orgId: string){
        const organization = await this.get(orgId);
        if(organization.isDefault) throw OrganizationError.DefaultOrganization();

        const teams = await Team.findBy({ orgId });
        const active = await User.findBy({ activeOrgId: orgId });
        await organization.remove();
        await User.getRepository().update({ activeOrgId: orgId }, { activeOrgId: null });
        for(const user of active){
            forgetOrgContext(user.id);
            await this.#webhooks.publish('user.activeOrg.changed', {
                userId: user.id,
                orgId
            });
        }
        for(const team of teams){
            await this.#webhooks.publish('team.removed', { teamId: team.id });
        }
    }
}
