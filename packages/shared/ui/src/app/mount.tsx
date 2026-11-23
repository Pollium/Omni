import { Catalogs } from '../contracts/i18n';
import { activateLocale, detectLocale } from '../i18n/locale';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, RouterProviderProps } from 'react-router-dom';

interface App{
    router: RouterProviderProps['router'];
    catalogs: Catalogs;
}

const followColorScheme = () => {
    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
        document.documentElement.classList.toggle('dark', scheme.matches);
        document.documentElement.dataset.theme = scheme.matches ? 'dark' : 'light';
    };

    apply();
    scheme.addEventListener('change', apply);
};

export const mountApp = async ({ router, catalogs }: App) => {
    window.addEventListener('vite:preloadError', () => window.location.reload());
    followColorScheme();
    await activateLocale(catalogs, detectLocale());

    createRoot(document.getElementById('root') as HTMLElement).render(
        <StrictMode>
            <I18nProvider i18n={i18n}>
                <RouterProvider router={router} />
            </I18nProvider>
        </StrictMode>
    );
};
