import { Language } from '../shared/language';

export interface CheckEmailInput{
    /** @format email */
    email: string;
}

export interface SignInInput{
    /** @format email */
    email: string;
    /** @minLength 8 */
    password: string;
}

export interface SignUpInput{
    /**
     * @minLength 1
     * @maxLength 80
     */
    fullName: string;
    /** @format email */
    email: string;
    /**
     * @minLength 3
     * @maxLength 32
     */
    username: string;
    /** @minLength 8 */
    password: string;
    /** @maxLength 160 */
    bio?: string;
    /** @pattern ^\+[1-9][0-9]{6,14}$ */
    phone?: string;
    /** @maxLength 64 */
    source?: string;
    /** @maxLength 64 */
    campaign?: string;
}

export interface ForgotPasswordInput{
    /** @format email */
    email: string;
    language: Language;
}

export interface ResetPasswordInput{
    token: string;
    /** @minLength 8 */
    newPassword: string;
}

export interface ExchangeCodeInput{
    code: string;
    /**
     * @minLength 43
     * @maxLength 128
     */
    verifier: string;
}

export interface HandoffInput{
    /** @pattern ^[A-Za-z0-9_-]{43}$ */
    challenge: string;
}
