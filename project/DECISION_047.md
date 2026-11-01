# ADR-047 — Guided sample must use the real reviewed-state pipeline

**Status:** Accepted

The Acme HealthTech demo is a deterministic fixture, not a parallel mock product. Launching the sample creates the same tenant-scoped assessment, processing snapshot, approved extraction review, deterministic diagnostic envelope, completed finding review, accepted findings, and immutable report snapshot used by the real local/single-instance workflow.

The sample may pre-complete human decisions for demo predictability, but it may not inject findings that the existing deterministic rules did not generate, bypass evidence validation, alter MVP limits, include regulated/customer records, credentials, secrets, or live production access, or silently delete an existing active assessment. A conflicting active assessment fails closed with a visible workspace-limit error.
