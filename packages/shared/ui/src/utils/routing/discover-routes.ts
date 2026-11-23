import { PageLoader } from '../../contracts/route';
import { RouteObject } from 'react-router-dom';

const toKebab = (segment: string): string =>
    segment
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
        .toLowerCase();

const pathOf = (file: string): string => {
    const segments = file
        .replace(/^.*\/pages\/[^/]+\//, '')
        .replace(/index\.tsx$/, '')
        .split('/')
        .filter(Boolean)
        .map(toKebab);

    return `/${segments.join('/')}`;
};

export const discoverRoutes = (pages: Record<string, PageLoader>): RouteObject[] =>
    Object.entries(pages).map(([file, load]) => ({
        path: pathOf(file),
        lazy: async () => ({ Component: (await load()).default })
    }));
