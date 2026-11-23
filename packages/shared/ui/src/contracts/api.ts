export type Request<A extends readonly unknown[], O> = (...args: A) => PromiseLike<O>;

export interface Mutation<A extends readonly unknown[], O>{
    run: (...args: A) => Promise<O>;
    loading: boolean;
    error: Error | undefined;
}

export interface CallOptions<I>{
    query?: object;
    body?: I;
}
