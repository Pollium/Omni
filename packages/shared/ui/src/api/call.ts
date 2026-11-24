import adapterFetch from 'alova/fetch';
import { ApiError as ApiErrorPayload, ApiResponse } from '@omni/contracts/shared/http';
import { Endpoint } from '@omni/contracts/shared/routing';
import { env } from '../config/env';
import { CallOptions } from '../contracts/api';
import { ApiError } from '../services/ApiError';
import { useSessionStore } from '../store/session';
import { createAlova, RequestBody } from 'alova';

const alova = createAlova({
    baseURL: env.apiUrl,
    requestAdapter: adapterFetch(),
    cacheFor: null,

    beforeRequest(method){
        const token = useSessionStore.getState().token;

        method.config.headers['Content-Type'] = method.data === undefined ? '' : 'application/json';
        if(token) method.config.headers.Authorization = `Bearer ${token}`;
    },

    responded: {
        async onSuccess(response){
            const payload = response.status === 204
                ? undefined
                : await response.json().catch(() => undefined);

            if(!response.ok){
                const message = (payload as ApiErrorPayload | undefined)?.error ?? response.statusText;
                throw new ApiError(response.status, message, payload);
            }

            return (payload as ApiResponse<unknown> | undefined)?.data;
        },

        onError(error){
            throw new ApiError(0, 'Network request failed', undefined, { cause: error });
        }
    }
});

export const call = <I, O>(endpoint: Endpoint<I, O>, options: CallOptions<I> = {}) => {
    const config = options.query ? { params: options.query as Record<string, unknown> } : {};
    const body = options.body as RequestBody | undefined;
    const params = options.params ?? {};
    const path = endpoint.path.replace(/:(\w+)/g, (_, name: string) => encodeURIComponent(params[name]));

    switch(endpoint.method){
        case 'POST': return alova.Post<O>(path, body, config);
        case 'PATCH': return alova.Patch<O>(path, body, config);
        case 'PUT': return alova.Put<O>(path, body, config);
        case 'DELETE': return alova.Delete<O>(path, body, config);
        default: return alova.Get<O>(path, config);
    }
};
