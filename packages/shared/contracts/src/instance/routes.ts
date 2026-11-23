import { get } from '../shared/routing';
import { Instance } from './domain';

export const instanceRoutes = {
    get: get<Instance>('/instance')
};
