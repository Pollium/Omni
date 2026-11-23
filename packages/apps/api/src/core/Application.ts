import multipart from '@fastify/multipart';
import Application from '@readable/http/Application';
import { createDataSource } from '@readable/http/data-source';
import { discoverFrom } from '@readable/http/discover';
import { ensureDefaultOrganization } from '@/modules/organizations/services/DefaultOrganization';
import { config } from '@/shared/config';

const createApp = () => new Application({
    port: config.port,
    corsOrigins: [...config.corsOrigins],
    log: config.log,
    discover: () => discoverFrom(import.meta.url),
    createDataSource: (entities) => createDataSource(config.database, entities),
    plugins: async (app) => {
        await app.register(multipart, { limits: { fileSize: config.avatar.maxBytes } });
    },
    afterDatabase: async () => {
        await ensureDefaultOrganization();
    }
});

export default createApp;
