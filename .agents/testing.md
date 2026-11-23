# Testing

The suites are **Vitest** running through each package's `vite.config.ts`, the same plugins the api
runs with: `@Body()` validation is injected at build time by `autoValidateBody` and compiled by
`@typia/unplugin`, so a test exercises the exact code production runs. Don't add another runner.
Tests live in `packages/apps/api` and `packages/shared/readable`. The web has no test stack; check it
in a browser.

## Running

```
pnpm infra                          # omni-dev Postgres on 5447 and Redis on 6395
pnpm test                           # every package's suite, one package at a time
cd packages/apps/api && npx vitest run src/modules/auth/tests/AuthController.test.ts
```

Run Vitest inside the package. Each pool slot gets its own schema (`DATABASE_SCHEMA` from
`VITEST_POOL_ID`, dropped and created by `tests/setup.ts`); `resetDb` truncates it before each test and
the default organization is created again. `hookTimeout` is 60 s because `useApp()` builds the whole
app through the typia transform; a cold cache looks like a hang.

## The harness (`packages/apps/api/tests`)

- `setup.ts`: the env (Google and Microsoft configured, GitHub not; two apps, `web` is home), the
  schema, and mocks for `BaseQueue.prototype.add` and the rate-limit store. No mail is sent and no
  webhook leaves the process.
- `harness.ts`:
  - `useApp()` builds the app once per file;
  - `authHeader(userId)` signs a session;
  - `SERVICE` is the `x-omni-key` header;
  - `mails()` and `deliveries(type)` read what the code put on the mail and webhook queues;
  - `useWebhooks()` / `useMembershipHook()` turn the URLs on for a `describe` block;
  - `expectSigned(header, body)` recomputes a signature.
- Seeds live next to each module's tests (`user/tests/UserSeed.ts`, `teams/tests/TeamSeed.ts`, …).

**Never put a `.test.ts` inside `controllers/`, `models/` or `queues/`.** Discovery imports every file
there.

## What to test

- Behaviour through HTTP with `request(app, route, { as, body, params, query, headers })`, asserting the
  status, the error code (`expectError(res, 409, 'Invitation::SeatsExhausted')`) and the rows.
- What leaves Omni through `mails()` and `deliveries()`, not through the queues' internals.
- Queue processors and hooks with a stubbed `fetch` (`webhooks/tests/DeliveryQueue.test.ts`).
- Name tests by behaviour in plain sentences: "refuses an invitation when the organization has no seat left".
