# The web

`packages/apps/web` is the sign-in site, React 19 + Vite + HeroUI + Tailwind 4 + lingui (es, en).
Pages are discovered from `src/modules/*/pages/{guest,public}/**/index.tsx`. Shared plumbing is in
`@omni/ui` (`packages/shared/ui`).

- Before the first page renders, the app loads `GET /instance` (name, apps, OAuth providers, terms and
  privacy URLs); every page reads it, nothing is branded at build time.
- The api is `VITE_API_URL`, or `${origin}/api` when empty. In dev, Vite proxies `/api` to :3001 (prefix
  stripped) and `/auth/oauth/<provider>/callback` unchanged; `deploy/nginx.conf` does the same in the
  container.
- Omni's own session sits in localStorage `omni.session`; the PKCE verifier of a pending handoff in
  sessionStorage `omni.handoff`.
- `app` in the query picks one of `instance.apps`; missing or unknown means the home app. After
  sign-in or sign-up the page bounces to `<app url>/auth/callback?next=`.
- Copy is wrapped in lingui macros; run `pnpm --filter @omni/web extract` and translate every new
  Spanish string in `src/locales/es/*.po` before calling a change done.
