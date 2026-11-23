import Organization from '../models/Organization';
import Webhooks from '@/modules/webhooks/services/Webhooks';
import { config } from '@/shared/config';

let cachedId: string | null = null;

export const ensureDefaultOrganization = async (): Promise<string> => {
    const existing = await Organization.findOne({ where: { isDefault: true }, select: { id: true } });
    if(existing !== null){
        cachedId = existing.id;
        return existing.id;
    }

    const organization = await Organization.create({
        name: config.organization.defaultName,
        description: '',
        website: '',
        isDefault: true,
        createdBy: null
    }).save();

    await new Webhooks().publish('organization.created', {
        orgId: organization.id,
        createdBy: null
    });

    cachedId = organization.id;
    return organization.id;
};

export const defaultOrganizationId = async (): Promise<string> => {
    if(cachedId !== null) return cachedId;

    return ensureDefaultOrganization();
};
