import { defineConfig } from '@lingui/cli';

export default defineConfig({
    sourceLocale: 'en',
    locales: ['en', 'es'],
    fallbackLocales: { default: 'en' },
    catalogs: [
        {
            path: '<rootDir>/src/locales/{locale}/{name}',
            include: ['<rootDir>/src/modules/{name}']
        }
    ]
});
