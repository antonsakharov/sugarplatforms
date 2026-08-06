# Development

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Validation

```bash
npm run validate
```

The validation command runs TypeScript checks, source-policy lint checks, Node tests, and a production Next.js build.

## Current routes

- `/` — product entry page
- `/assessment/new` — assessment setup entry route
- `/sample` — Acme sample entry route
- `/api/health` — health endpoint

## Current limits

Limits are parsed and validated in `lib/config.ts`. They will also be enforced server-side in the upload and assessment APIs as those features are implemented.
