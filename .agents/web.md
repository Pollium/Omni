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
- The console (`modules/console`) is `/admin`. Its pages live in `pages/admin/**`, which the router
  keeps out of the flat list and nests under `ConsoleLayout`: the layout sends a signed-out visitor to
  `/sign-in?app=omni&next=…`, shows `NoAccess` on a 403, and wraps the pages in `Shell` (sidebar, ⌘K,
  `G` + letter, toasts). Pages read `useConsole()` for the member, the default organization and the roles.
  Sign-in comes back through `/admin/auth/callback`, a public page that only follows `next`.
- The console's look is scoped: `ConsoleLayout` puts `console` on `<html>`, and `index.css` defines its
  tokens (`side`, `panel`, `band`, `line`, `hover`, `pressed`, `faint`) and Inter for `:root.console` only, so
  the sign-in pages keep their own. Menus and dialogs render outside the layout and still match.
- Reads go through `useQuery(key, request)` from `@omni/ui`: a new key reloads, `reload()` refetches and
  `replace()` swaps the data after a write. `call(endpoint, { params })` fills `:name` in the path.
- Copy is wrapped in lingui macros; run `pnpm --filter @omni/web extract` and translate every new
  Spanish string in `src/locales/es/*.po` before calling a change done.
