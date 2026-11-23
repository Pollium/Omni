import { Mutation, Request } from '../../contracts/api';
import { toError } from '../../utils/format/errors';
import { useState } from 'react';

export const useMutation = <A extends readonly unknown[], O>(request: Request<A, O>): Mutation<A, O> => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | undefined>(undefined);

    const run = async (...args: A): Promise<O> => {
        setLoading(true);
        setError(undefined);

        try{
            return await request(...args);
        }catch(cause){
            setError(toError(cause));
            throw cause;
        }finally{
            setLoading(false);
        }
    };

    return {
        run,
        loading,
        error
    };
};
