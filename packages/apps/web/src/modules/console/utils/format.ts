import { i18n } from '@lingui/core';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

const startOfDay = (date: Date): number => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export const count = (value: number): string => new Intl.NumberFormat(i18n.locale).format(value);

export const percent = (part: number, whole: number): string => new Intl.NumberFormat(i18n.locale, { style: 'percent' }).format(whole === 0 ? 0 : part / whole);

export const shortDate = (iso: string): string => new Intl.DateTimeFormat(i18n.locale, { day: 'numeric', month: 'short' }).format(new Date(iso));

export const longDate = (iso: string): string => new Intl.DateTimeFormat(i18n.locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));

export const ago = (iso: string): string => {
    const elapsed = Date.now() - new Date(iso).getTime();
    const relative = new Intl.RelativeTimeFormat(i18n.locale, { numeric: 'auto' });
    if(elapsed < HOUR_MS) return relative.format(-Math.max(1, Math.round(elapsed / MINUTE_MS)), 'minute');
    if(elapsed < DAY_MS) return relative.format(-Math.round(elapsed / HOUR_MS), 'hour');
    if(elapsed < 7 * DAY_MS) return relative.format(-Math.round(elapsed / DAY_MS), 'day');

    return shortDate(iso);
};

export const until = (iso: string): string => {
    const days = Math.round((startOfDay(new Date(iso)) - startOfDay(new Date())) / DAY_MS);

    return capitalize(new Intl.RelativeTimeFormat(i18n.locale, { numeric: 'auto' }).format(days, 'day'));
};

export const dayLabel = (iso: string): string => {
    const days = Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / DAY_MS);
    if(days < 2) return capitalize(new Intl.RelativeTimeFormat(i18n.locale, { numeric: 'auto' }).format(-days, 'day'));

    return capitalize(new Intl.DateTimeFormat(i18n.locale, { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(iso)));
};

export const hasPassed = (iso: string): boolean => new Date(iso).getTime() < Date.now();

export const host = (url: string): string => url.replace(/^https?:\/\//, '').replace(/\/$/, '');
