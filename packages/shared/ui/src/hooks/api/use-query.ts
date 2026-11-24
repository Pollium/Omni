import { Query, Request } from '../../contracts/api';
import { toError } from '../../utils/format/errors';
import { useEffect, useEffectEvent, useState } from 'react';

interface Settled<O>{
    ticket: string;
    data: O | undefined;
    error: Error | undefined;
}

export const useQuery = <O>(key: string, request: Request<[], O>): Query<O> => {
    const [version, setVersion] = useState(0);
    const [settled, setSettled] = useState<Settled<O> | null>(null);
    const load = useEffectEvent(() => request());
    const ticket = `${key}#${version}`;

    useEffect(() => {
        let isCurrent = true;

        Promise.resolve(load()).then((data) => {
            if(isCurrent) setSettled({ ticket, data, error: undefined });
        }, (cause: unknown) => {
            if(isCurrent) setSettled((previous) => ({ ticket, data: previous?.data, error: toError(cause) }));
        });

        return () => {
            isCurrent = false;
        };
    }, [ticket]);

    return {
        data: settled?.data,
        error: settled?.ticket === ticket ? settled.error : undefined,
        loading: settled?.ticket !== ticket,
        reload: () => setVersion((current) => current + 1),
        replace: (data) => setSettled({ ticket, data, error: undefined })
    };
};
