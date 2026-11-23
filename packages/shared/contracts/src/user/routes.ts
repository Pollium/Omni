import { get, post, patch, del } from '../shared/routing';
import { AuthSession } from '../auth/domain';
import { User } from './domain';
import { UpdateProfileInput, ChangePasswordInput, ChangeEmailInput, ChangePhoneInput, SetActiveOrganizationInput } from './http';

export const userRoutes = {
    me: get<User>('/user/me'),
    updateProfile: patch<UpdateProfileInput, User>('/user/me'),
    deleteMe: del('/user/me'),
    setActiveOrganization: patch<SetActiveOrganizationInput, User>('/user/me/active-organization'),
    changePassword: patch<ChangePasswordInput, AuthSession>('/user/me/password'),
    changeEmail: patch<ChangeEmailInput, User>('/user/me/email'),
    changePhone: patch<ChangePhoneInput, User>('/user/me/phone'),
    uploadAvatar: post<never, User>('/user/me/avatar'),
    avatar: get<void>('/users/:userId/avatar')
};
