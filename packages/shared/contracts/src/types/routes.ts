import { get } from '../shared/routing';
import { TypesBundle } from './domain';

export const typeRoutes = {
    bundle: get<TypesBundle>('/types')
};
