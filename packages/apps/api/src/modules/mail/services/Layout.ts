import { MailAction, MailMessage } from '../contracts/mail';
import { config } from '@/shared/config';

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const INK = '#18181b';
const MUTED = '#71717a';
const LINE = '#e4e4e7';
const CANVAS = '#f4f4f5';

const ESCAPES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
};

export default class Layout{
    html(message: MailMessage): string{
        return `<!doctype html><html lang="${message.language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">`
            + `<title>${this.#escape(message.heading)}</title></head>`
            + `<body style="margin:0;padding:0;background:${CANVAS};">`
            + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CANVAS};">`
            + `<tr><td align="center" style="padding:32px 16px;">`
            + `<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:#ffffff;border:1px solid ${LINE};border-radius:12px;">`
            + `<tr><td style="padding:32px 32px 8px 32px;font-family:${FONT};">`
            + `<h1 style="margin:0;font-size:20px;line-height:1.3;color:${INK};font-weight:600;">${this.#escape(message.heading)}</h1>`
            + `</td></tr>`
            + message.lines.map((line) => this.#paragraph(line)).join('')
            + this.#button(message.action)
            + `<tr><td style="padding:24px 32px 32px 32px;font-family:${FONT};font-size:12px;line-height:1.6;color:${MUTED};border-top:1px solid ${LINE};">`
            + `${this.#escape(config.name)}</td></tr>`
            + `</table></td></tr></table></body></html>`;
    }

    text(message: MailMessage): string{
        const blocks = [message.heading, ...message.lines];
        if(message.action !== null) blocks.push(`${message.action.label}: ${message.action.url}`);
        blocks.push(config.name);

        return blocks.join('\n\n');
    }

    #paragraph(line: string): string{
        return `<tr><td style="padding:8px 32px;font-family:${FONT};font-size:15px;line-height:1.6;color:${INK};">`
            + `${this.#escape(line)}</td></tr>`;
    }

    #button(action: MailAction | null): string{
        if(action === null) return '';

        return `<tr><td style="padding:24px 32px 8px 32px;">`
            + `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>`
            + `<td align="center" bgcolor="${INK}" style="border-radius:8px;">`
            + `<a href="${this.#escape(action.url)}" style="display:inline-block;padding:12px 22px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">`
            + `${this.#escape(action.label)}</a>`
            + `</td></tr></table></td></tr>`;
    }

    #escape(value: string): string{
        return value.replace(/[&<>"']/g, (match) => ESCAPES[match]);
    }
}
