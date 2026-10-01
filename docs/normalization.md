# Normalization

Do not normalize changing ledger data until exact record/replay is proven.

Future normalization should be explicit, deterministic, and method-aware. Candidate fields include ledger sequence, close time, transaction hashes, pagination cursors, TTL data, Soroban transaction data, diagnostic events, authorization entries, and XDR.

Raw Stellar RPC representations should remain available even when semantic decoding is added.

The core package exposes `NormalizationRegistry` for opt-in semantic views. Register a rule with an exact RPC method and an optional request or response normalizer. Rules are not applied during default record/replay matching, and they never mutate the raw request or response stored in a cassette.

Normalizers must be pure and deterministic. A registry rejects empty methods and duplicate registrations so normalization behavior remains explicit and auditable.
