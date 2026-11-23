import { typeRoutes } from '@omni/contracts/types/routes';
import { config } from '@/shared/config';
import { SERVICE, useApp } from '@tests/harness';
import { request, expectError } from '@tests/request';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('TypesController', () => {
    const ctx = useApp();

    it('hands the contracts only to callers presenting the service key', async () => {
        expectError(await request(ctx.app, typeRoutes.bundle), 401, 'Auth::Unauthorized');
        expectError(await request(ctx.app, typeRoutes.bundle, { headers: { [config.serviceKeyHeader]: 'not-the-key' } }),
            401, 'Auth::Unauthorized');
    });

    it('bundles every contract file by its path, with a version digest of them all', async () => {
        const res = await request(ctx.app, typeRoutes.bundle, { headers: SERVICE });

        expect(res.status).toBe(200);
        const { version, files } = res.data();
        expect(version).toBe(createHash('sha256').update(JSON.stringify(files)).digest('hex').slice(0, config.types.digestLength));
        expect(files['auth/routes.ts']).toBe(await readFile(join(config.types.source, 'auth/routes.ts'), 'utf8'));
        expect(Object.keys(files)).toEqual(expect.arrayContaining([
            'directory/routes.ts',
            'shared/routing.ts',
            'webhooks/domain.ts'
        ]));

        expect(Object.keys(files).every((path) => path.endsWith('.ts'))).toBe(true);
    });
});
