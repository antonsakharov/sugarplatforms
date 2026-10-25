# Decision 088 — Test-only ESM alias resolution

Date: 2026-10-25  
Status: Accepted for CI recovery.

## Context

The production Next.js bundler and TypeScript understand the `@/*` import alias, but the Node 22 native `--experimental-strip-types --test` runner does not read `tsconfig.json` path mappings. After networked `npm ci` and type checking succeeded on GitHub Actions, tests importing `@/lib/*` failed before exercising any behavior with `ERR_MODULE_NOT_FOUND`.

## Decision

- Register a dependency-free Node ESM loader only in the `npm test` command, using Node's `--import` plus `node:module.register` API. This does not modify the Next.js production runtime or browser bundle.
- Map only the repository-local `@/lib/<safe-path>` namespace and extensionless relative imports originating **inside `lib/`** to existing `.ts`, `.tsx`, `.mjs` or `.js` source files. Reject traversal, unsupported aliases and missing files. Leave standard npm and `node:` imports to the default resolver.
- Add positive, negative and passthrough regression tests. Keep the existing `--experimental-strip-types` execution path and never invoke external services for test-module resolution.
- Require a fresh GitHub Actions run to validate the complete dependency-backed test suite and build; an offline local runner without native SQLite cannot certify them.

## Boundaries

This loader is test-only. It must not expand access to uploaded artifacts, tenant data, private keys, production APIs, or arbitrary filesystem paths. The assessment MVP limits, evidence rules and production security gates remain unchanged.
