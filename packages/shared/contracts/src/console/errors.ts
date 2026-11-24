import { ErrorCode, ErrorTable } from '../shared/errors';

export const ConsoleErrors = {
    domain: 'Console',
    causes: {
        NotAdmin: 403,
        OwnAdmin: 409,
        OwnAccount: 409,
        InvalidFilter: 400
    }
} as const satisfies ErrorTable;

export type ConsoleErrorCode = ErrorCode<typeof ConsoleErrors>;
