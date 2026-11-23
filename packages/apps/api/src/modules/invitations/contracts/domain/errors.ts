import { defineErrors } from '@readable/utils/errors/define-errors';
import { InvitationErrors } from '@omni/contracts/invitation/errors';

export const InvitationError = defineErrors(InvitationErrors);
