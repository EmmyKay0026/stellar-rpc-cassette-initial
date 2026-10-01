# Normalization

Do not normalize changing ledger data until exact record/replay is proven.

Future normalization should be explicit, deterministic, and method-aware. Candidate fields include ledger sequence, close time, transaction hashes, pagination cursors, TTL data, Soroban transaction data, diagnostic events, authorization entries, and XDR.

Raw Stellar RPC representations should remain available even when semantic decoding is added.

The core package exposes `NormalizationRegistry` for opt-in semantic views. Register a rule with an exact RPC method and an optional request or response normalizer. Rules are not applied during default record/replay matching, and they never mutate the raw request or response stored in a cassette.

Normalizers must be pure and deterministic. A registry rejects empty methods and duplicate registrations so normalization behavior remains explicit and auditable.

For raw Stellar values, core also exposes `inspectBase64Xdr`, `normalizeBase64Xdr`, and `isBase64Xdr`. These helpers validate base64 framing, report byte length, and canonicalize whitespace/padding without attempting to infer the XDR type. Type-specific decoding remains an optional higher-level concern, while the original cassette value stays authoritative.
