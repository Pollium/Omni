import Layout from '../services/Layout';
import MailQueue from '../queues/Mail';
import { logger } from '@readable/utils/Logger';
import { MailMessage } from '../contracts/mail';
import { config } from '@/shared/config';
import { createTransport } from 'nodemailer';
import { afterEach, describe, expect, it, vi } from 'vitest';

const sendMail = vi.fn();

vi.mock('nodemailer', () => ({
    createTransport: vi.fn(() => ({ sendMail }))
}));

const MESSAGE: MailMessage = {
    to: 'someone@example.test',
    language: 'es',
    subject: 'Asunto',
    heading: 'Hola',
    lines: ['Una línea'],
    action: null
};

describe('MailQueue', () => {
    const smtp = { ...config.smtp };

    afterEach(() => {
        Object.assign(config.smtp, smtp);
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });

    it('only logs a mail while no SMTP host is configured', async () => {
        const info = vi.spyOn(logger, 'info').mockReturnValue();

        await new MailQueue().process(MESSAGE);

        expect(info).toHaveBeenCalledWith('mail not sent, SMTP_HOST is empty', {
            scope: 'mail',
            to: MESSAGE.to,
            subject: MESSAGE.subject
        });

        expect(createTransport).not.toHaveBeenCalled();
        expect(sendMail).not.toHaveBeenCalled();
    });

    it('sends the html and text versions through the configured SMTP server', async () => {
        Object.assign(config.smtp, {
            host: 'smtp.example.test',
            user: 'mailer',
            password: 'secret',
            from: 'Omni <no-reply@example.test>'
        });

        const queue = new MailQueue();
        const layout = new Layout();

        await queue.process(MESSAGE);
        await queue.process(MESSAGE);

        expect(createTransport).toHaveBeenCalledExactlyOnceWith({
            host: 'smtp.example.test',
            port: smtp.port,
            secure: smtp.secure,
            auth: {
                user: 'mailer',
                pass: 'secret'
            }
        });

        expect(sendMail).toHaveBeenCalledWith({
            from: 'Omni <no-reply@example.test>',
            to: MESSAGE.to,
            subject: MESSAGE.subject,
            html: layout.html(MESSAGE),
            text: layout.text(MESSAGE)
        });

        expect(sendMail).toHaveBeenCalledTimes(2);
    });

    it('sends from the instance name while no sender is configured', () => {
        expect(smtp.from).toBe('Omni <no-reply@localhost>');
    });
});
