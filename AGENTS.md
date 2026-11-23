# Omni — agent guide

Omni is a self-hosted identity service. One deployment serves one product: it holds the product's
accounts (email + password, Google, GitHub, Microsoft), organizations, teams and invitations, runs the
sign-in pages, and hands each of the product's apps a signed session. Nothing in Omni knows which
product it serves; the name, the apps, the providers and the mail come from env. pnpm monorepo:

| Package | What it is | Port |
|---|---|---|
| `packages/apps/api` (`@omni/api`) | the only backend: auth, users and roles, organizations, teams, invitations, the service-key directory, avatars, mail, signed webhooks, `/instance`, `/types` | 3001 |
| `packages/apps/web` (`@omni/web`) | the sign-in site (React + Vite + HeroUI + lingui es/en): sign-in, sign-up, forgot/reset password, `/continue`, the OAuth return, sign-out | 5176 (https) |
| `packages/shared/readable` (`@omni/readable`) | the HTTP framework: `Application`, module discovery, decorators, errors, `BaseModel`, JWT and passwords, session cutoffs, BullMQ queues | — |
| `packages/shared/contracts` (`@omni/contracts`) | every wire type, route table and error table, one folder per domain; the api serves them at `/types` | — |
| `packages/shared/ui` (`@omni/ui`) | the web's plumbing and components: `call`, forms, session store, PKCE handoff, AuthShell | — |

Modules are auto-discovered from the filesystem by folder convention — there is no registry file to
edit. Modules talk to each other through services and models; nothing in Omni calls itself over HTTP.

## How a product uses Omni

```
app ──/sign-in?app=<id>&next──▶ web ──▶ api /auth/*            (password or OAuth)
web ──▶ <app url>/auth/callback?code   app ──POST /auth/oauth/exchange {code, verifier}──▶ api
app's backend ──x-omni-key──▶ api /directory/*                  (users, roles, orgs, teams)
api ──signed POST──▶ WEBHOOK_URL         (user.created, user.removed, team.removed, session.revoked…)
api ──signed POST──▶ MEMBERSHIP_HOOK_URL (may this org take one more member?)
```

- Sessions are HS256 JWTs signed with `JWT_SECRET` (7 days, `sub` = user id). The product's backend
  verifies them with the same secret. A password change, reset or account removal writes a cutoff and
  sends `session.revoked` with it, so the backend can refuse tokens issued before it.
- `APPS` is the list of the product's apps (`[{"id":"web","url":"https://app.example.com"}]`). The first
  one is home: unknown `app` ids go there, and invitation links open `<home>/invite/<token>`.
- OAuth providers redirect to `${WEB_URL}/auth/oauth/<provider>/callback`; the web's nginx (and the Vite
  dev server) pass that path to the api. Register exactly that URL in each provider's console.
- Every webhook body is `{ id, type, payload, occurredAt }` with
  `omni-signature: t=<unix>,v1=<hex hmac-sha256(SERVICE_KEY, "<t>.<body>")>`; non-2xx answers are retried
  with backoff. Deliveries can repeat, so dedupe on `id`.
- Roles are free strings (`^[a-z][a-z0-9_-]{0,31}$`) the product grants over the directory; Omni gives
  them no meaning.

The full protocol, with copyable snippets, is in [.agents/integrating.md](.agents/integrating.md).

## Commands

```
pnpm infra                                    # Postgres :5447, Redis :6395 (compose project omni-dev)
pnpm dev                                      # infra + api (:3001) + web (https://localhost:5176)
pnpm --filter @omni/api test                  # Vitest, inside the package
pnpm typecheck && pnpm lint && pnpm test      # the gates a change must pass
pnpm --filter @omni/web build                 # tsc -b && vite build
pnpm --filter @omni/api set-password <email> <password>
docker compose up -d --build                  # the self-hosted stack: web on :8090, api on :3001
```

`pnpm dev` needs `packages/apps/api/.env`: copy `.env.example` and fill `JWT_SECRET` and `SERVICE_KEY`
(`openssl rand -hex 32` each). The self-hosted stack reads the root `.env` (`.env.example` beside it).

This file is a router, not a manual. Read the file that matches your task before writing code.

| If you are going to… | Read |
|---|---|
| Connect a product to Omni (sessions, directory, webhooks, the membership hook, types) | [.agents/integrating.md](.agents/integrating.md) |
| Work in the api — modules, config, mail, webhooks | [.agents/api.md](.agents/api.md) |
| Work in the web | [.agents/web.md](.agents/web.md) |
| Write or run tests | [.agents/testing.md](.agents/testing.md) |
| Know the quality bar — what not to write, comments included | [.agents/anti-slop.md](.agents/anti-slop.md) |

## Deploying

- `docker-compose.yml` is the self-hosted stack (Postgres, Redis, api, web behind nginx), configured
  from the root `.env`.
- `compose.quantum.yml` is production on Quantum. `POSTGRES_PASSWORD`, `NAME`, `WEB_URL`, `API_URL`,
  `APPS`, `JWT_SECRET` and `SERVICE_KEY` are required stack variables; the rest default to off.
- Moving a database to a new stack means moving `JWT_SECRET` with it, or every open session ends.
- With `SMTP_HOST` empty, mail is only logged. Reset links then never arrive.

## Things that will otherwise burn an hour

- **Vitest runs inside the package.** `cd packages/apps/api && npx vitest run`.
- **Never `tsc -b` in the api.** It sets no `outDir`; typecheck with `tsc --noEmit`. `tsc -b` is correct
  in `packages/apps/web` (its `build` script).
- **After editing contracts**, clear the api's typia cache
  (`rm -rf packages/apps/api/node_modules/.cache/unplugin_typia`) and restart the web dev server.
- **`BaseModel` ids default to Postgres 18's `uuidv7()`.** An older Postgres fails at `synchronize`.
- **Timestamps are `timestamp without time zone`.** Run the api in UTC (`TZ=UTC`).
- **The dev api (`vite-node --watch`) can die with `EADDRINUSE`** after a file change. Restart it.

Code style: 4-space indent, single quotes, semicolons, `if(` / `}else{` / `try{` / `}catch{`
with no space, `class Name extends Base{`, `interface Name{`, private `#fields`, no comments,
English identifiers and copy.
