import { Instance } from '@omni/contracts/instance/domain';
import { AuthFlow } from '@/modules/auth/contracts/auth';
import { appOf } from '@/modules/auth/utils/app';
import { INSTANCE_ROUTE } from '@/modules/auth/utils/instance';
import { useRouteLoaderData, useSearchParams } from 'react-router-dom';

export const useAuthFlow = (): AuthFlow => {
    const instance = useRouteLoaderData(INSTANCE_ROUTE) as Instance;
    const [params] = useSearchParams();

    return {
        instance,
        app: appOf(instance, params.get('app')),
        next: params.get('next')
    };
};
