# ADR-049: Fail closed at a pre-persistence malware quarantine boundary

**Status:** Accepted

Uploaded bytes are treated as quarantined until every artifact in the focused upload set receives an explicit clean result from the server-selected malware scanner. Malware scanning must occur after basic metadata/content inspection but before durable object storage, parsing, extraction, or evidence persistence. An infected result rejects the set; scanner outage, timeout, or unrecognized output also rejects the set rather than bypassing scanning. The local/demo provider may use bounded deterministic signatures to exercise the contract but cannot be represented as production malware certification. Production scanning is activated behind the same interface using ClamAV `INSTREAM` or another future provider with equivalent fail-closed semantics. Scanner configuration is server-only and uploaded content must not be written to routine logs or audit records.
