import { ConsoleErrorCode } from '@omni/contracts/console/errors';
import { baseCodeOf } from '@omni/contracts/shared/errors';
import { i18n, MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';

const MESSAGES: Partial<Record<ConsoleErrorCode | 'Directory::InvalidRole', MessageDescriptor>> = {
    'Console::OwnAdmin': msg`You can't take the admin role from yourself.`,
    'Console::OwnAccount': msg`You can't delete your own account from here.`,
    'Directory::InvalidRole': msg`A role is lowercase letters, numbers, dashes or underscores.`
};

export const consoleErrorMessage = (error: unknown): string => {
    const code = error instanceof Error ? baseCodeOf(error.message) : '';

    return i18n._(MESSAGES[code as ConsoleErrorCode] ?? msg`That didn't work. Try again.`);
};
