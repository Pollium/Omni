# Connecting a product to Omni

One Omni deployment per product. The product has one backend and any number of frontends ("apps").

## 1. Configure the deployment

```
NAME=Acme                                   # shown on the sign-in pages and in every mail
WEB_URL=https://id.acme.com                 # Omni's web
API_URL=https://api.id.acme.com             # Omni's api (avatars are served from here)
APPS=[{"id":"web","url":"https://app.acme.com"},{"id":"admin","url":"https://admin.acme.com"}]
JWT_SECRET=…                                # shared with the product's backend
SERVICE_KEY=…                               # the backend's key for /directory and /types; also signs webhooks
WEBHOOK_URL=https://api.acme.com/iam/webhooks
MEMBERSHIP_HOOK_URL=https://api.acme.com/iam/hooks/membership
TERMS_URL=https://acme.com/terms            # both or neither: the line under the form needs both
PRIVACY_URL=https://acme.com/privacy
```

An app that runs its own sign-up adds `"signUpUrl":"https://app.acme.com/welcome"`. Omni then sends an
email it doesn't know to `signUpUrl?email=…&next=…` instead of its own `/sign-up`, and the app creates
the account with `POST ${OMNI_API}/auth/sign-up` (`fullName`, `email`, `username`, `password`, and
optionally `bio`, `phone`, `source`, `campaign`). The answer is `{ token, user }`; no handoff is needed.

OAuth: set `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`, `MICROSOFT_CLIENT_ID/SECRET`
(+ `MICROSOFT_TENANT`). A provider shows on the sign-in page only with both values. Its redirect URL is
`${WEB_URL}/auth/oauth/<google|github|microsoft>/callback`.

## 2. Sign an app in

The app owns `/auth/callback`. Without a session:

```ts
const verifier = randomBase64Url(32);
const challenge = base64url(sha256(verifier));
sessionStorage.setItem('handoff', JSON.stringify({ verifier, next }));
location.href = `${OMNI_WEB}/continue?app=web&challenge=${challenge}&next=${encodeURIComponent(next)}`;
```

Omni signs the person in if needed (or creates the account at `/sign-up`) and comes back to
`<app url>/auth/callback?code=…`. Exchange the code within two minutes:

```ts
const { token, user } = await post(`${OMNI_API}/auth/oauth/exchange`, { code, verifier });
```

`/sign-in?app=web&next=` and `/sign-out?app=web` are plain links. Profile calls (`/user/me`, avatar,
email, password, phone, active organization), `/organizations`, `/teams` and `/invitations` take the
token as `Authorization: Bearer`.

## 3. Verify sessions in the backend

```ts
const session = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }); // { sub, iat, exp }
if(session.iat < cutoffOf(session.sub)) refuse();
```

Keep the cutoffs from `session.revoked` (below). Tokens last seven days.

## 4. Read the directory

Every `/directory/*` route takes `x-omni-key: <SERVICE_KEY>`. The route table is
`@omni/contracts/directory/routes`: users (one, all, by username, summaries, search, census), roles
(`PUT`/`DELETE /directory/users/:userId/roles/:role`, `GET /directory/roles/:role/users`), organizations,
members and teams. Removing a user there is the same as the person deleting their account.

## 5. Receive webhooks

```ts
const [, at, digest] = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(req.headers['omni-signature']);
const expected = hmacSha256(SERVICE_KEY, `${at}.${rawBody}`);
if(!timingSafeEqual(expected, digest) || Math.abs(now - at) > 300) refuse(401);
const delivery: WebhookDelivery = JSON.parse(rawBody);  // { id, type, payload, occurredAt }
```

Answer 2xx; anything else is retried with exponential backoff for about a day. Dedupe on `id`.
Types and payloads: `@omni/contracts/webhooks/domain`.

| type | payload |
|---|---|
| `user.created` | `{ userId, fullName, username }` |
| `user.removed` | `{ userId }` |
| `user.activeOrg.changed` | `{ userId, orgId }` |
| `organization.created` | `{ orgId, createdBy }` |
| `team.created` | `{ teamId, orgId, createdBy }` |
| `team.removed` | `{ teamId }` |
| `session.revoked` | `{ userId, cutoff }` (unix seconds) |

## 6. Decide seats

Before an invitation is created, and before an invitee joins an organization they aren't in, Omni
POSTs `{ orgId, email }` to `MEMBERSHIP_HOOK_URL`, signed the same way, and expects
`{ "allowed": boolean }` as the whole body. `false` refuses with `Invitation::SeatsExhausted`. Without the variable every membership is allowed.

## 7. Share the types

`GET /types` (with the service key) returns every file of `packages/shared/contracts/src` and a
version digest. Write them into the product's repo with a small script and import from there, so the
product never hand-copies a contract.
