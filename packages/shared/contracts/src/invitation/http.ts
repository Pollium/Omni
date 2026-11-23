import { Language } from '../shared/language';
import { TeamRole } from '../team/domain';

export interface CreateInvitationInput{
    teamId: string;
    /** @format email */
    email: string;
    role?: TeamRole.Admin | TeamRole.Member;
    language: Language;
}
