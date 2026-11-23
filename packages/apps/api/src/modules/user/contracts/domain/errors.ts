import { defineErrors } from '@readable/utils/errors/define-errors';
import { AvatarErrors, UserErrors } from '@omni/contracts/user/errors';

export const UserError = defineErrors(UserErrors);
export const AvatarError = defineErrors(AvatarErrors);
