import { User } from '../user/domain';

export type OAuthProvider = 'google' | 'microsoft' | 'github';

export interface AuthSession{
    token: string;
    user: User;
}

export interface EmailAvailability{
    exists: boolean;
}
