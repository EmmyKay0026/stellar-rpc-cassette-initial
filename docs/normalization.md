# Normalization

Do not normalize changing ledger data until exact record/replay is proven.

Future normalization should be explicit, deterministic, and method-aware. Candidate fields include ledger sequence, close time, transaction hashes, pagination cursors, TTL data, Soroban transaction data, diagnostic events, authorization entries, and XDR.

Raw Stellar RPC representations should remain available even when semantic decoding is added.
