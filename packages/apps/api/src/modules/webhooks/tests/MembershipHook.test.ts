import MembershipHook from '../services/MembershipHook';
import { MembershipRequest, SIGNATURE_HEADER } from '@omni/contracts/webhooks/domain';
import { MEMBERSHIP_HOOK_URL, expectSigned, useMembershipHook } from '@tests/harness';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const REQUEST: MembershipRequest = {
    orgId: '0193a5d2-7c4e-7000-8000-000000000001',
    email: 'invitee@example.test'
};

describe('MembershipHook', () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const hook = new MembershipHook();

    beforeEach(() => {
        vi.stubGlobal('fetch', fetch);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        fetch.mockReset();
    });

    it('allows every membership without asking while no hook is configured', async () => {
        await expect(hook.allows(REQUEST)).resolves.toBe(true);
        expect(fetch).not.toHaveBeenCalled();
    });

    describe('with a hook configured', () => {
        useMembershipHook();

        it('asks the hook with a signed request and follows its verdict', async () => {
            fetch
                .mockResolvedValueOnce(Response.json({ allowed: true }))
                .mockResolvedValueOnce(Response.json({ allowed: false }));

            await expect(hook.allows(REQUEST)).resolves.toBe(true);
            await expect(hook.allows(REQUEST)).resolves.toBe(false);

            const [url, init] = fetch.mock.calls[0];
            const headers = init!.headers as Record<string, string>;
            expect(url).toBe(MEMBERSHIP_HOOK_URL);
            expect(init).toMatchObject({
                method: 'POST',
                body: JSON.stringify(REQUEST)
            });

            expectSigned(headers[SIGNATURE_HEADER], JSON.stringify(REQUEST));
        });

        it('fails when the hook answers with an error', async () => {
            fetch.mockResolvedValue(new Response('down', { status: 500 }));

            await expect(hook.allows(REQUEST)).rejects.toThrow('Webhook::MembershipHookFailed:500');
        });

        it('fails on a verdict that is not a yes or a no', async () => {
            fetch.mockResolvedValue(Response.json({ allowed: 'maybe' }));

            await expect(hook.allows(REQUEST)).rejects.toThrow();
        });
    });
});
