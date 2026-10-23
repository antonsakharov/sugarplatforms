# ADR-077 — Canonical baseline integrity gate

Date: 2026-10-15
Status: Accepted for local recovery; not release certified.

Require baseline documentation and exact npm lockfile parity before clean dependency installation and release certification. CI must use npm ci rather than silently resolving drift with npm install. A recovery pull request may remain draft while these checks fail. Never fabricate npm integrity metadata, merge automatically, or deploy during recovery.
