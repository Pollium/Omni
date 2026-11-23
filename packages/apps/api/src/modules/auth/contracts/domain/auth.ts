import User from '@/modules/user/models/User';

export interface Session{
    token: string;
    user: User;
}

export interface HandoffRecord{
    session: Session;
    challenge: string;
}
