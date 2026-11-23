import { PendingHandoff } from '../../contracts/session';

const KEY = 'omni.handoff';
const VERIFIER_BYTES = 32;

const base64url = (bytes: Uint8Array): string =>
    btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export const beginHandoff = async (next: string | null): Promise<string> => {
    const verifier = base64url(crypto.getRandomValues(new Uint8Array(VERIFIER_BYTES)));
    const pending: PendingHandoff = {
        verifier,
        next
    };
    sessionStorage.setItem(KEY, JSON.stringify(pending));

    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return base64url(new Uint8Array(digest));
};

export const takeHandoff = (): PendingHandoff | null => {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return raw === null ? null : JSON.parse(raw) as PendingHandoff;
};
