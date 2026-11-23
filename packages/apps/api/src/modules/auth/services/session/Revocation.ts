import Webhooks from '@/modules/webhooks/services/Webhooks';
import { sessionCutoffs } from '@readable/auth/verifiedSession';

export default class SessionRevocation{
    #webhooks = new Webhooks();

    async revoke(userId: string){
        const cutoff = await sessionCutoffs.cut(userId);
        await this.#webhooks.publish('session.revoked', {
            userId,
            cutoff
        });
    }
}
