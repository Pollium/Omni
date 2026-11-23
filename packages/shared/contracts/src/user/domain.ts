import { BaseEntity } from '../shared/base';

export interface UserProfile{
    fullName: string;
    username: string;
    email: string;
    bio: string;
}

export interface User extends UserProfile, BaseEntity{
    activeOrgId: string | null;
    avatarUrl: string | null;
    phone: string | null;
}

export interface PublicUserSummary{
    userId: string;
    fullName: string;
    username: string;
    avatarUrl: string | null;
}
