import Pending from '@/modules/auth/components/Pending';
import Unavailable from '@/modules/auth/components/Unavailable';
import { INSTANCE_ROUTE, loadInstance } from '@/modules/auth/utils/instance';
import { PageModule } from '@omni/ui/contracts/route';
import { discoverRoutes } from '@omni/ui/utils/routing/discover-routes';
import { createBrowserRouter, Navigate } from 'react-router-dom';

const pages = import.meta.glob<PageModule>('/src/modules/*/pages/**/index.tsx');

export const router = createBrowserRouter([{
    id: INSTANCE_ROUTE,
    loader: loadInstance,
    shouldRevalidate: () => false,
    HydrateFallback: Pending,
    ErrorBoundary: Unavailable,
    children: [
        ...discoverRoutes(pages),
        {
            path: '*',
            element: <Navigate to='/sign-in' replace />
        }
    ]
}]);
