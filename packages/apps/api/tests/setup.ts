import { vi } from 'vitest';

const databaseUrl = 'postgres://omni:omni@localhost:5447/omni';
const schema = `omni_test_${(process.env.VITEST_POOL_ID ?? '1').replace(/\W/g, '')}`;

Object.assign(process.env, {
    NAME: 'Omni',
    WEB_URL: 'https://id.example.test',
    API_URL: 'https://api.example.test',
    APPS: JSON.stringify([
        {
            id: 'web',
            url: 'https://app.example.test',
            signUpUrl: 'https://app.example.test/welcome'
        },
        {
            id: 'console',
            url: 'https://console.example.test'
        }
    ]),
    JWT_SECRET: 'test-jwt-secret',
    SERVICE_KEY: 'test-service-key',
    PORT: '3001',
    DATABASE_URL: databaseUrl,
    DATABASE_SCHEMA: schema,
    DATABASE_SYNCHRONIZE: 'true',
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6395',
    LOG_LEVEL: 'silent',
    LOG_PRETTY: 'false',
    TERMS_URL: 'https://example.test/terms',
    PRIVACY_URL: 'https://example.test/privacy',
    WEBHOOK_URL: '',
    MEMBERSHIP_HOOK_URL: '',
    DEFAULT_ORGANIZATION_NAME: '',
    INVITATION_TTL_HOURS: '',
    GOOGLE_CLIENT_ID: 'google-id',
    GOOGLE_CLIENT_SECRET: 'google-secret',
    GITHUB_CLIENT_ID: '',
    GITHUB_CLIENT_SECRET: '',
    MICROSOFT_CLIENT_ID: 'microsoft-id',
    MICROSOFT_CLIENT_SECRET: 'microsoft-secret',
    MICROSOFT_TENANT: 'common',
    SMTP_HOST: '',
    SMTP_USER: '',
    SMTP_PASSWORD: '',
    MAIL_FROM: ''
});

const { Client } = await import('pg');
const client = new Client({ connectionString: databaseUrl });
await client.connect();
await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
await client.query(`CREATE SCHEMA "${schema}"`);
await client.end();

const { default: BaseQueue } = await import('@readable/queues/BaseQueue');
const { rateLimitStore } = await import('@readable/testing/rate-limit');

vi.spyOn(rateLimitStore, 'incr').mockImplementation((_key, done) => done(null, { current: 1, ttl: 60_000 }));
vi.spyOn(BaseQueue.prototype, 'add').mockResolvedValue();
