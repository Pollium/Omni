import { ErrorCode, ErrorTable } from '../shared/errors';

export const DirectoryErrors = {
    domain: 'Directory',
    causes: {
        InvalidRole: 400,
        InvalidCensusRange: 400
    }
} as const satisfies ErrorTable;

export type DirectoryErrorCode = ErrorCode<typeof DirectoryErrors>;
