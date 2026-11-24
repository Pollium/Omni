export type Request<A extends readonly unknown[], O> = (...args: A) => PromiseLike<O>;

export interface Mutation<A extends readonly unknown[], O>{
    run: (...args: A) => Promise<O>;
    loading: boolean;
    error: Error | undefined;
}

export interface Query<O>{
    data: O | undefined;
    error: Error | undefined;
    loading: boolean;
    reload: () => void;
    replace: (data: O) => void;
}

export interface CallOptions<I>{
    params?: Record<string, string>;
    query?: object;
    body?: I;
}
