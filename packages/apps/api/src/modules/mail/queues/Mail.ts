import Layout from '../services/Layout';
import BaseQueue from '@readable/queues/BaseQueue';
import { logger } from '@readable/utils/Logger';
import { MailMessage } from '../contracts/mail';
import { config } from '@/shared/config';
import { createTransport, Transporter } from 'nodemailer';
import { JobsOptions } from 'bullmq';

export default class MailQueue extends BaseQueue<MailMessage>{
    readonly name = 'mail';
    #layout = new Layout();
    #transport: Transporter | null = null;

    protected readonly jobOptions: JobsOptions = {
        attempts: 6,
        backoff: {
            type: 'exponential',
            delay: 10_000
        },
        removeOnComplete: true
    };

    async process(message: MailMessage){
        if(config.smtp.host === ''){
            logger.info('mail not sent, SMTP_HOST is empty', {
                scope: 'mail',
                to: message.to,
                subject: message.subject
            });
            return;
        }

        await this.#connect().sendMail({
            from: config.smtp.from,
            to: message.to,
            subject: message.subject,
            html: this.#layout.html(message),
            text: this.#layout.text(message)
        });
    }

    #connect(): Transporter{
        this.#transport ??= createTransport({
            host: config.smtp.host,
            port: config.smtp.port,
            secure: config.smtp.secure,
            auth: {
                user: config.smtp.user,
                pass: config.smtp.password
            }
        });

        return this.#transport;
    }
}
