import { defineErrors } from '@readable/utils/errors/define-errors';
import { TeamErrors } from '@omni/contracts/team/errors';

export const TeamError = defineErrors(TeamErrors);
