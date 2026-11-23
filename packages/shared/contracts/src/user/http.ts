import { Language } from '../shared/language';

export interface UpdateProfileInput{
    /**
     * @minLength 1
     * @maxLength 80
     */
    fullName?: string;
    /**
     * @minLength 3
     * @maxLength 32
     */
    username?: string;
    /** @maxLength 160 */
    bio?: string;
}

export interface ChangePasswordInput{
    currentPassword: string;
    /** @minLength 8 */
    newPassword: string;
}

export interface ChangeEmailInput{
    /** @format email */
    email: string;
    currentPassword: string;
    language: Language;
}

export interface ChangePhoneInput{
    /**
     * @minLength 1
     * @pattern ^\+[1-9][0-9]{6,14}$
     */
    phone: string;
}

export interface SetActiveOrganizationInput{
    orgId: string;
}
