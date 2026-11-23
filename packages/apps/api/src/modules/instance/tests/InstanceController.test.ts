import { instanceRoutes } from '@omni/contracts/instance/routes';
import { config } from '@/shared/config';
import { useApp } from '@tests/harness';
import { request } from '@tests/request';
import { describe, expect, it } from 'vitest';

describe('InstanceController', () => {
    const ctx = useApp();

    it('describes the instance to anyone, listing only the sign-in providers it holds credentials for', async () => {
        const res = await request(ctx.app, instanceRoutes.get);

        expect(res.status).toBe(200);
        expect(res.data()).toEqual({
            name: 'Omni',
            apps: [
                {
                    id: 'web',
                    url: 'https://app.example.test'
                },
                {
                    id: 'console',
                    url: 'https://console.example.test'
                }
            ],
            providers: ['google', 'microsoft'],
            termsUrl: 'https://example.test/terms',
            privacyUrl: 'https://example.test/privacy'
        });
    });

    it('lists a provider as soon as both its client id and secret are set', async () => {
        const github = { ...config.oauth.github };
        Object.assign(config.oauth.github, {
            clientId: 'github-id',
            clientSecret: ''
        });

        const halfway = await request(ctx.app, instanceRoutes.get);
        Object.assign(config.oauth.github, { clientSecret: 'github-secret' });
        const complete = await request(ctx.app, instanceRoutes.get);
        Object.assign(config.oauth.github, github);

        expect(halfway.data().providers).toEqual(['google', 'microsoft']);
        expect(complete.data().providers).toEqual(['google', 'microsoft', 'github']);
    });
});
