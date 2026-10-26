# GreenGeeks shared-hosting deployment

Target: `https://sugarplatforms.com/diagnostics` using cPanel Node.js 20.20.2.

## cPanel application

- Node.js version: `20.20.2`
- Application mode: `Production`
- Application root: `sugarplatform`
- Application URL: `sugarplatforms.com/diagnostics`
- Startup file: `server.js`

## Required application environment

Set these in the cPanel Node.js application's environment-variable section:

```text
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://sugarplatforms.com/diagnostics
NEXT_PUBLIC_BASE_PATH=/diagnostics
AUTH_PROVIDER=local
PERSISTENCE_PROVIDER=sqlite
ARTIFACT_STORAGE_PROVIDER=local
NEXT_PUBLIC_DEMO_MODE=true
LOCAL_AUTH_ENABLED=true
ASSESSMENT_DB_PATH=.data/sugar-platform-diagnostic.sqlite
PRIVATE_ARTIFACT_ROOT=.data/private-artifacts
```

The settings above are for a controlled staging/demo deployment. Do not use the local auth/SQLite/local-object-storage combination for confidential customer production data.

## Install and build

From the cPanel Terminal/SSH shell, activate the virtual environment using the command shown by cPanel, then enter `/home/sugarpla/sugarplatform` and run:

```sh
npm install
npm run build
```

Restart the application from cPanel after the build completes. Do not run `npm run validate` on Node 20: the repository test command uses Node 22 strip-types support. CI remains the authoritative full validation environment.

## Smoke checks

After restart verify:

- `/diagnostics` renders the landing page.
- `/diagnostics/api/health` returns `{"status":"ok"...}`.
- `/diagnostics/sample` launches the controlled Acme HealthTech sample.
- Browser developer tools show no requests escaping to root-level `/api/*` or `/_next/*`.

## Production upgrade

Before confidential production use, switch to Supabase-backed auth, PostgreSQL/RLS persistence, and private object storage and complete the live two-tenant isolation certification described in the security and delivery documentation.
