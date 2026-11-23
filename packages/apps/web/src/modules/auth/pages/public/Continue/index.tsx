import Loader from '@omni/ui/components/Loader';
import { useSessionStore } from '@omni/ui/store/session';
import { authApi } from '@/modules/auth/api/api';
import { useAuthFlow } from '@/modules/auth/hooks/use-auth-flow';
import { appCallbackUrl, authHref } from '@/modules/auth/utils/app';
import { useLingui } from '@lingui/react/macro';
import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const Continue = () => {
    const { t } = useLingui();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const flow = useAuthFlow();
    const { app } = flow;
    const signInHref = authHref('/sign-in', flow);
    const challenge = params.get('challenge');
    const started = useRef(false);

    useEffect(() => {
        if(started.current) return;
        started.current = true;

        const signIn = () => navigate(signInHref, { replace: true });

        const run = async () => {
            if(challenge === null || useSessionStore.getState().token === null){
                await signIn();
                return;
            }

            try{
                const { code } = await authApi.handoff({ challenge });
                window.location.replace(appCallbackUrl(app, { code }));
            }catch{
                await signIn();
            }
        };

        void run();
    }, [app, challenge, navigate, signInHref]);

    return <Loader label={t`Continuing`} className='min-h-dvh bg-canvas' />;
};

export default Continue;
