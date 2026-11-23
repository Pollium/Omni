import Loader from '@omni/ui/components/Loader';
import { useSessionStore } from '@omni/ui/store/session';
import { useAuthFlow } from '@/modules/auth/hooks/use-auth-flow';
import { useLingui } from '@lingui/react/macro';
import { useEffect } from 'react';

const SignOut = () => {
    const { t } = useLingui();
    const { app } = useAuthFlow();

    useEffect(() => {
        useSessionStore.getState().clear();
        window.location.replace(app.url);
    }, [app]);

    return <Loader label={t`Signing out`} className='min-h-dvh bg-canvas' />;
};

export default SignOut;
