# Cassette format

The initial format is versioned JSON.

```json
{
  "format": "stellar-rpc-cassette",
  "version": 1,
  "recordedAt": "2026-09-30T14:00:00Z",
  "interactions": [
    {
      "sequence": 1,
      "request": {
        "jsonrpc": "2.0",
        "method": "getLatestLedger",
        "params": {}
      },
      "response": {
        "jsonrpc": "2.0",
        "id": 1,
        "result": {
          "sequence": 123456
        }
      }
    }
  ]
}
```

Raw RPC response values remain authoritative. Human-readable decoding or Stellar-aware normalization should be layered on later rather than replacing the original wire representation.

Each recorded response must contain exactly one of `result` or `error`. JSON-RPC error objects preserve their numeric `code`, string `message`, and optional `data` value. Replay rewrites the recorded response ID to the incoming request ID for both successful and error responses.

## Versioning and migration

Cassettes carry a `version` number. This build understands version 1; the
constant `CURRENT_CASSETTE_VERSION` (exported from the core package) is the
single source of truth.

`migrateCassette(raw)` upgrades older, valid cassettes to the current shape
without losing any interaction:

- **No `version` field** — treated as a pre-versioned v1. `format` and
  `recordedAt` are filled with canonical defaults and each interaction is
  validated individually, so a single bad entry produces a field-level
  error instead of rejecting the whole file.
- **`version: 1`** — run through the full `CassetteSchema` (field-level
  validation plus the JSON-RPC `result`-or-`error` invariant).
- **`version > CURRENT_CASSETTE_VERSION`** — rejected with an
  `UnsupportedCassetteVersionError` whose message names the requested and
  supported versions, so it can be surfaced verbatim.

Interactions are always kept in their recorded order, and recorded responses
are preserved byte-for-byte (replay rewrites only the JSON-RPC `id`).
Migration is deterministic: the same input always yields the same upgraded
cassette.
