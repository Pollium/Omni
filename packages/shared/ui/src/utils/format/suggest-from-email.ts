export interface EmailSuggestion{
    fullName?: string;
    username?: string;
}

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 32;
const NAME_TOKEN_MIN_LENGTH = 2;
const FULL_NAME_MAX_LENGTH = 80;

const fold = (token: string): string => {
    return token
        .normalize('NFD')
        .replace(/\p{M}+/gu, '')
        .replace(/['’]/g, '')
        .toLocaleLowerCase();
};

const capitalize = (token: string): string => {
    return token
        .toLocaleLowerCase()
        .replace(/(^|['’])(\p{L})/gu, (_, prefix: string, letter: string) => prefix + letter.toLocaleUpperCase());
};

const usernameFrom = (tokens: string[]): string | undefined => {
    const handle = tokens.map(fold).join('');
    if(!/^[a-z]+$/.test(handle) || handle.length < USERNAME_MIN_LENGTH) return undefined;
    return handle.slice(0, USERNAME_MAX_LENGTH);
};

const fullNameFrom = (tokens: string[]): string | undefined => {
    if(tokens.length < 2) return undefined;
    if(tokens.some((token) => token.length < NAME_TOKEN_MIN_LENGTH)) return undefined;

    const fullName = tokens.map(capitalize).join(' ');
    return fullName.length > FULL_NAME_MAX_LENGTH ? undefined : fullName;
};

export const suggestFromEmail = (email: string): EmailSuggestion => {
    const tokens = email
        .split('@')[0]
        .split('+')[0]
        .split(/[._-]+/)
        .filter(Boolean);

    if(tokens.length === 0) return {};

    return {
        fullName: fullNameFrom(tokens),
        username: usernameFrom(tokens)
    };
};
