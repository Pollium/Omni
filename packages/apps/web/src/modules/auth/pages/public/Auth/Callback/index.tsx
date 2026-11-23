import AuthShell from '@omni/ui/components/AuthShell';
import { takeHandoff } from '@omni/ui/utils/session/handoff';
import { authApi } from '@/modules/auth/api/api';
import { useAuthFlow } from '@/modules/auth/hooks/use-auth-flow';
import { authHref, finishAuth } from '@/modules/auth/utils/app';
import { Trans, useLingui } from '@lingui/react/macro';
import { Button } from '@heroui/react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthCallback = () => {
    const { t } = useLingui();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const flow = useAuthFlow();
    const { app } = flow;
    const code = params.get('code');
    const [error, setError] = useState<string | null>(null);
    const started = useRef(false);

    useEffect(() => {
        if(started.current) return;
        started.current = true;

        const run = async () => {
            if(code === null){
                setError(t`Missing authorization code.`);
                return;
            }

            const pending = takeHandoff();
            if(pending === null){
                setError(t`This sign-in was not started in this tab.`);
                return;
            }

            try{
                const session = await authApi.oauthExchange({
                    code,
                    verifier: pending.verifier
                });
                finishAuth(session, app, pending.next);
            }catch(cause: unknown){
                setError(cause instanceof Error ? cause.message : t`Sign-in failed.`);
            }
        };

        void run();
    }, [app, code, t]);

    if(error !== null){
        return (
            <AuthShell>
                <div className='flex flex-col items-center gap-4 text-center'>
                    <h1 className='text-lg font-medium text-foreground'><Trans>Sign-in failed</Trans></h1>
                    <p className='text-sm text-muted'>{error}</p>
                    <Button variant='secondary' fullWidth onPress={() => void navigate(authHref('/sign-in', flow))}>
                        <Trans>Back to sign in</Trans>
                    </Button>
                </div>
            </AuthShell>
        );
    }

    return (
        <AuthShell>
            <div className='flex flex-col items-center gap-3 text-center'>
                <div className='size-6 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground' />
                <p className='text-sm text-muted'><Trans>Completing sign-in…</Trans></p>
            </div>
        </AuthShell>
    );
};

export default AuthCallback;
