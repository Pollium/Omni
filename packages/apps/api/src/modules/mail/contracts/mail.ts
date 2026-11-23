import { Language } from '@omni/contracts/shared/language';

export interface MailAction{
    label: string;
    url: string;
}

export interface MailMessage{
    to: string;
    language: Language;
    subject: string;
    heading: string;
    lines: string[];
    action: MailAction | null;
}

export type MailCopy = Omit<MailMessage, 'to' | 'language'>;
