import { config } from '@/shared/config';
import { createHmac } from 'node:crypto';

export default class Signature{
    header(body: string, at: number = Math.floor(Date.now() / 1000)): string{
        const digest = createHmac('sha256', config.serviceKey)
            .update(`${at}.${body}`)
            .digest('hex');

        return `t=${at},v1=${digest}`;
    }
}
