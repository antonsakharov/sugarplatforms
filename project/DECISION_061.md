# ADR-061 — Managed operational reads use request identity

**Status:** Accepted

Administrator audit and deletion-job reads select the configured persistence provider at the server boundary. Managed reads forward verified request identity, repeat server-derived tenant filters, and rely on forced administrator RLS. Mutation/executor activation remains a separate slice.
