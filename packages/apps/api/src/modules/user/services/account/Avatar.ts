import User from '../../models/User';
import Avatar from '../../models/Avatar';
import RawResponse from '@readable/controllers/responses/Raw';
import { findOrThrow } from '@readable/utils/models/find-or-throw';
import { AvatarError, UserError } from '../../contracts/domain/errors';
import { config } from '@/shared/config';
import { fileTypeFromBuffer } from 'file-type';

const UPLOAD_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export default class AvatarService{
    async provision(user: User){
        await this.#store(user, Buffer.from(this.#render(user.username)), 'image/svg+xml');
    }

    async replace(userId: string, bytes: Buffer): Promise<User>{
        const detected = await fileTypeFromBuffer(bytes);
        if(detected === undefined || !UPLOAD_TYPES.has(detected.mime)) throw AvatarError.UnsupportedType();

        const user = await findOrThrow(User, { id: userId }, UserError.NotFound);
        await this.#store(user, bytes, detected.mime);

        return user;
    }

    async read(userId: string): Promise<RawResponse>{
        const avatar = await findOrThrow(Avatar, { userId }, AvatarError.NotFound);

        return new RawResponse(avatar.bytes, avatar.contentType, 200, {
            'cache-control': `public, max-age=${config.avatar.cacheSeconds}`,
            'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'",
            'x-content-type-options': 'nosniff'
        });
    }

    async #store(user: User, bytes: Buffer, contentType: string){
        await Avatar.upsert({
            userId: user.id,
            contentType,
            bytes
        }, ['userId']);

        user.avatarUrl = `${config.apiUrl}/users/${user.id}/avatar?v=${Date.now().toString(36)}`;
        await user.save();
    }

    #render(seed: string): string{
        const hue = this.#hash(seed) % 360;
        const hue2 = (hue + 60) % 360;

        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">`
            + `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">`
            + `<stop offset="0%" stop-color="hsl(${hue} 70% 55%)"/>`
            + `<stop offset="100%" stop-color="hsl(${hue2} 70% 45%)"/>`
            + `</linearGradient></defs><rect width="128" height="128" fill="url(#g)"/></svg>`;
    }

    #hash(seed: string): number{
        let h = 2166136261;
        for(let i = 0; i < seed.length; i++){
            h ^= seed.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }

        return h >>> 0;
    }
}
