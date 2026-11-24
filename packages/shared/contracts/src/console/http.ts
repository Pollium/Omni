import { Language } from '../shared/language';
import { ConsoleUserView, SignInMethod } from './domain';

export interface ConsoleUsersQuery{
    q?: string;
    view?: ConsoleUserView;
    method?: SignInMethod;
    offset?: number;
    limit?: number;
}

export interface ConsoleTeamsQuery{
    offset?: number;
    limit?: number;
}

export interface ConsolePasswordResetInput{
    language: Language;
}
