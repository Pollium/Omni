import Signature from './Signature';
import typia from 'typia';
import { MembershipRequest, MembershipVerdict, SIGNATURE_HEADER } from '@omni/contracts/webhooks/domain';
import { WebhookError } from '../contracts/domain/errors';
import { config } from '@/shared/config';

export default class MembershipHook{
    #signature = new Signature();

    async allows(request: MembershipRequest): Promise<boolean>{
        if(config.webhooks.membershipUrl === '') return true;

        const response = await this.#ask(JSON.stringify(request));
        if(!response.ok) throw WebhookError.MembershipHookFailed(String(response.status));

        return typia.assert<MembershipVerdict>(await response.json()).allowed;
    }

    async #ask(body: string): Promise<Response>{
        try{
            return await fetch(config.webhooks.membershipUrl, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    [SIGNATURE_HEADER]: this.#signature.header(body)
                },
                body,
                signal: AbortSignal.timeout(config.webhooks.timeoutMs)
            });
        }catch{
            throw WebhookError.MembershipHookFailed('unreachable');
        }
    }
}
