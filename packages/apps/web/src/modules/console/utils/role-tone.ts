const TONES = [
    'oklch(0.62 0.17 290)',
    'oklch(0.72 0.15 65)',
    'oklch(0.66 0.14 155)',
    'oklch(0.64 0.14 245)',
    'oklch(0.63 0.18 25)',
    'oklch(0.7 0.12 195)'
];

const HASH_MODULUS = 9973;

export const roleTone = (role: string): string =>
    TONES[[...role].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % HASH_MODULUS, 1) % TONES.length];
