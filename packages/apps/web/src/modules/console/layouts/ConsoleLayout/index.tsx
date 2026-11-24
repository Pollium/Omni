import Pending from '@/modules/auth/components/Pending';
import Unavailable from '@/modules/auth/components/Unavailable';
import NoAccess from '@/modules/console/components/NoAccess';
import Shell from '@/modules/console/components/Shell';
import { consoleApi } from '@/modules/console/api/api';
import { authHref } from '@/modules/auth/utils/app';
import { INSTANCE_ROUTE } from '@/modules/auth/utils/instance';
import { Instance } from '@omni/contracts/instance/domain';
import { useQuery } from '@omni/ui/hooks/api/use-query';
import { ApiError } from '@omni/ui/services/ApiError';
import { useSessionStore } from '@omni/ui/store/session';
import { useEffect } from 'react';
import { useLocation, useRouteLoaderData } from 'react-router-dom';

const CONSOLE_CLASS = 'console';

const ConsoleLayout = () => {
    const instance = useRouteLoaderData(INSTANCE_ROUTE) as Instance;
    const token = useSessionStore((state) => state.token);
    const { pathname, search } = useLocation();
    const member = useQuery(`member:${token ?? ''}`, () => token === null ? Promise.resolve(null) : consoleApi.me());
    const isSignedOut = token === null || (member.error instanceof ApiError && member.error.status === 401);
    const isRefused = member.error instanceof ApiError && member.error.status === 403;
    const signInHref = authHref('/sign-in', { app: instance.console, next: `${pathname}${search}` });
    const signOutHref = `/sign-out?app=${instance.console.id}`;

    useEffect(() => {
        document.documentElement.classList.add(CONSOLE_CLASS);

        return () => document.documentElement.classList.remove(CONSOLE_CLASS);
    }, []);

    useEffect(() => {
        if(!isSignedOut) return;
        useSessionStore.getState().clear();
        window.location.replace(signInHref);
    }, [isSignedOut, signInHref]);

    if(isRefused) return <NoAccess signOutHref={signOutHref} />;
    if(member.error !== undefined && !isSignedOut) return <Unavailable />;
    if(isSignedOut || member.data === undefined || member.data === null) return <Pending />;

    return <Shell instance={instance} member={member.data} signOutHref={signOutHref} />;
};

export default ConsoleLayout;
