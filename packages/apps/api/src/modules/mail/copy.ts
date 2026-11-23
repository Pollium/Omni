import { Language } from '@omni/contracts/shared/language';
import { MailCopy } from './contracts/mail';
import { config } from '@/shared/config';

export interface ResetFacts{
    url: string;
    minutes: number;
}

export interface InvitationFacts{
    inviter: string;
    team: string;
    url: string;
    hours: number;
}

export interface EmailChangedFacts{
    email: string;
}

export const resetCopy: Record<Language, (facts: ResetFacts) => MailCopy> = {
    es: ({ url, minutes }) => ({
        subject: `Restablece tu contraseña de ${config.name}`,
        heading: 'Restablece tu contraseña',
        lines: [
            `Pediste cambiar la contraseña de tu cuenta de ${config.name}. El enlace vence en ${minutes} minutos.`,
            'Si no fuiste tú, ignora este correo. Tu contraseña sigue igual.'
        ],
        action: {
            label: 'Elegir contraseña nueva',
            url
        }
    }),
    en: ({ url, minutes }) => ({
        subject: `Reset your ${config.name} password`,
        heading: 'Reset your password',
        lines: [
            `You asked to change the password on your ${config.name} account. The link expires in ${minutes} minutes.`,
            'If this was not you, ignore this email. Your password stays the same.'
        ],
        action: {
            label: 'Choose a new password',
            url
        }
    })
};

export const invitationCopy: Record<Language, (facts: InvitationFacts) => MailCopy> = {
    es: ({ inviter, team, url, hours }) => ({
        subject: `${inviter} te invitó a ${team} en ${config.name}`,
        heading: `Te invitaron a ${team}`,
        lines: [
            `${inviter} te invitó a unirte a ${team} en ${config.name}.`,
            `La invitación vence en ${hours} horas.`
        ],
        action: {
            label: 'Aceptar la invitación',
            url
        }
    }),
    en: ({ inviter, team, url, hours }) => ({
        subject: `${inviter} invited you to ${team} on ${config.name}`,
        heading: `You're invited to ${team}`,
        lines: [
            `${inviter} invited you to join ${team} on ${config.name}.`,
            `The invitation expires in ${hours} hours.`
        ],
        action: {
            label: 'Accept the invitation',
            url
        }
    })
};

export const emailChangedCopy: Record<Language, (facts: EmailChangedFacts) => MailCopy> = {
    es: ({ email }) => ({
        subject: `Cambió el correo de tu cuenta de ${config.name}`,
        heading: 'Cambió el correo de tu cuenta',
        lines: [
            `El correo de tu cuenta ahora es ${email}.`,
            'Si no fuiste tú, restablece tu contraseña ahora.'
        ],
        action: null
    }),
    en: ({ email }) => ({
        subject: `Your ${config.name} email address changed`,
        heading: 'Your email address changed',
        lines: [
            `The email on your account is now ${email}.`,
            'If this was not you, reset your password now.'
        ],
        action: null
    })
};
