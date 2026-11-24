import typia, { tags } from 'typia';
import { configure } from '@readable/config';
import { redisFromEnv, serviceConfig } from '@readable/service-config';
import { optionalEnv, requiredEnv } from '@readable/utils/env';
import { InstanceApp } from '@omni/contracts/instance/domain';
import { fileURLToPath, URL } from 'node:url';

const service = serviceConfig();
const name = requiredEnv('NAME');
const webUrl = requiredEnv('WEB_URL');
const apps = typia.json.assertParse<InstanceApp[] & tags.MinItems<1>>(requiredEnv('APPS'));

export const config = {
    ...service,
    name,
    webUrl,
    apiUrl: requiredEnv('API_URL'),
    apps,
    home: apps[0],
    corsOrigins: [webUrl, ...apps.map((app) => app.url)],
    jwtSecret: requiredEnv('JWT_SECRET'),
    serviceKey: requiredEnv('SERVICE_KEY'),
    serviceKeyHeader: 'x-omni-key',
    termsUrl: optionalEnv('TERMS_URL') ?? '',
    privacyUrl: optionalEnv('PRIVACY_URL') ?? '',
    redis: redisFromEnv(),
    oauth: {
        google: {
            clientId: optionalEnv('GOOGLE_CLIENT_ID') ?? '',
            clientSecret: optionalEnv('GOOGLE_CLIENT_SECRET') ?? ''
        },
        github: {
            clientId: optionalEnv('GITHUB_CLIENT_ID') ?? '',
            clientSecret: optionalEnv('GITHUB_CLIENT_SECRET') ?? ''
        },
        microsoft: {
            clientId: optionalEnv('MICROSOFT_CLIENT_ID') ?? '',
            clientSecret: optionalEnv('MICROSOFT_CLIENT_SECRET') ?? '',
            tenant: optionalEnv('MICROSOFT_TENANT') ?? 'common'
        },
        stateTtlSeconds: 600,
        handoffTtlSeconds: 120
    },
    smtp: {
        host: optionalEnv('SMTP_HOST') ?? '',
        port: Number(optionalEnv('SMTP_PORT') ?? 465),
        secure: optionalEnv('SMTP_SECURE') !== 'false',
        user: optionalEnv('SMTP_USER') ?? '',
        password: optionalEnv('SMTP_PASSWORD') ?? '',
        from: optionalEnv('MAIL_FROM') ?? `${name} <no-reply@localhost>`
    },
    webhooks: {
        url: optionalEnv('WEBHOOK_URL') ?? '',
        membershipUrl: optionalEnv('MEMBERSHIP_HOOK_URL') ?? '',
        attempts: 12,
        backoffMs: 5_000,
        keepDelivered: 200,
        timeoutMs: 10_000
    },
    organization: {
        defaultName: optionalEnv('DEFAULT_ORGANIZATION_NAME') ?? name,
        contextTtlMs: 30_000
    },
    invitation: {
        ttlHours: Number(optionalEnv('INVITATION_TTL_HOURS') ?? 168)
    },
    passwordReset: {
        ttlMinutes: 15
    },
    avatar: {
        maxBytes: 5 * 1024 * 1024,
        cacheSeconds: 86_400
    },
    roles: {
        pattern: /^[a-z][a-z0-9_-]{0,31}$/
    },
    console: {
        role: 'admin',
        maxDays: 183,
        recentUsers: 9,
        roleHolders: 100,
        invitations: 100,
        deliveries: 20
    },
    directory: {
        searchLimit: 10,
        maxCensusDays: 366
    },
    types: {
        source: fileURLToPath(new URL('../../../../shared/contracts/src', import.meta.url)),
        digestLength: 12
    }
} as const;

configure({
    jwtSecret: config.jwtSecret,
    redis: config.redis
});
