import { SignInMethod } from '@omni/contracts/console/domain';
import { useLingui } from '@lingui/react/macro';

export const useMethodLabel = (): ((method: SignInMethod) => string) => {
    const { t } = useLingui();
    const labels: Record<SignInMethod, string> = {
        google: 'Google',
        microsoft: 'Microsoft',
        github: 'GitHub',
        password: t`Password`
    };

    return (method) => labels[method];
};
