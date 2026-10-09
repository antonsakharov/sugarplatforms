# ADR-061 — Managed operational reads use request identity

**Status:** Accepted

Administrator audit and deletion-job reads select the configured persistence provider at the server boundary. Managed PostgreSQL reads forward the already verified request identity, repeat server-derived tenant filters, and rely on forced RLS for exact administrator membership. Privileged bypass credentials are not used for user-facing operational reads. Mutation/executor activation remains a separate slice.
