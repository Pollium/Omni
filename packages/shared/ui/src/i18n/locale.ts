import { Language } from '@omni/contracts/shared/language';
import { Catalogs } from '../contracts/i18n';
import { i18n } from '@lingui/core';

const LANGUAGES: readonly Language[] = ['en', 'es'];

const DEFAULT_LANGUAGE: Language = 'en';

const isLanguage = (value: string): value is Language => (LANGUAGES as readonly string[]).includes(value);

export const detectLocale = (): Language => {
    const preferred = navigator.language.slice(0, 2);
    return isLanguage(preferred) ? preferred : DEFAULT_LANGUAGE;
};

export const activateLocale = async (catalogs: Catalogs, locale: Language): Promise<void> => {
    const loaded = await Promise.all(Object.keys(catalogs)
        .filter((path) => path.includes(`/locales/${locale}/`))
        .map((path) => catalogs[path]()));

    i18n.load(locale, Object.assign({}, ...loaded.map((entry) => entry.messages)));
    i18n.activate(locale);
    document.documentElement.lang = locale;
};
