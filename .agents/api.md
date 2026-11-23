# The api

`packages/apps/api` is one Fastify app built by `@readable/http/Application` from the modules in
`src/modules/*`. `src/shared/config.ts` reads every env var once; nothing else reads `process.env`.

## Modules

| Module | Owns |
|---|---|
| `auth` | sign-in, sign-up, email availability, forgot/reset password, OAuth (`providers/` holds one class per provider on `OAuthProvider`), the PKCE handoff, session revocation |
| `user` | `User` and `Avatar`, profile, email, password, phone, avatar upload, active organization, account deletion, roles, public avatar route |
| `organizations` | organizations and memberships, the default organization every user joins, the per-user active org cache |
| `teams` | teams and team memberships, the personal team made at sign-up |
| `invitations` | team invitations by email, asking the membership hook before a seat is taken |
| `directory` | the `x-omni-key` routes the product's backend reads and writes |
| `mail` | `Mail.send()` → `MailQueue` (BullMQ, retried) → SMTP; es/en copy in `copy.ts`, the HTML in `services/Layout.ts` |
| `webhooks` | `Webhooks.publish(type, payload)` → `DeliveryQueue` → signed POST to `WEBHOOK_URL`; `MembershipHook`; `Signature` |
| `instance` | `GET /instance`, what the web needs to brand itself |
| `types` | `GET /types`, the contracts bundle |

## Rules of the house

- Anything a product should hear about goes through `Webhooks.publish`, after the change is saved.
  Don't use `eventBus` for it: it is in-process, and a product lives elsewhere.
- Revoking sessions is `SessionRevocation.revoke(userId)`: it writes the cutoff and tells the product.
- Every mail has Spanish and English copy in `mail/copy.ts`, takes the language from the request, and
  says the product's `NAME`, never a hard-coded one.
- Nothing product-specific in code. If a product needs a behaviour, it becomes config, a role, a
  webhook or a hook.
- Wire types, route tables and error tables live in `@omni/contracts`; module-internal types live in
  the module's `contracts/`.
