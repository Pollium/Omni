import { Instance } from '@omni/contracts/instance/domain';
import { authApi } from '@/modules/auth/api/api';

export const INSTANCE_ROUTE = 'instance';

export const loadInstance = async (): Promise<Instance> => {
    const instance = await authApi.instance();
    document.title = instance.name;
    return instance;
};
