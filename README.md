# Stellar RPC Cassette

Deterministic record-and-replay testing infrastructure for Stellar JSON-RPC applications.

This starter repository implements the first usable vertical slice: a versioned cassette schema, canonical request matching, a local record/replay proxy, strict replay with no upstream fallback, a CLI, tests, linting, formatting, build scripts, and CI.

## Why this exists

Tests that call live Stellar RPC endpoints can become slow, flaky, state-sensitive, provider-dependent, and difficult to reproduce. Stellar RPC Cassette records a real JSON-RPC interaction once and replays it later from a committed cassette.

It is deliberately **not** a Stellar SDK, full RPC server, explorer, blockchain simulator, or generic HTTP recorder.

## Requirements

- Node.js 20+
- Corepack

## Setup

```bash
corepack enable
pnpm install
pnpm check
```

CI installs dependencies with `pnpm install --frozen-lockfile` so dependency changes must include an updated lockfile.

## Record

```bash
pnpm --filter stellar-rpc-cassette build
node packages/cli/dist/index.js record \
  --upstream https://soroban-testnet.stellar.org \
  --cassette ./fixtures/get-latest-ledger/example.json
```

Point your application at:

```text
http://127.0.0.1:6969
```

Then make the Stellar RPC request you want to capture.

To run a test command against an automatically managed proxy, pass the command after `--`. The child receives the proxy URL in `STELLAR_RPC_URL`, and its exit code is returned:

```bash
node packages/cli/dist/index.js record \
  --upstream https://soroban-testnet.stellar.org \
  --cassette ./fixtures/test.json -- npm test
```
## Replay

```bash
node packages/cli/dist/index.js replay \
  --cassette ./fixtures/get-latest-ledger/example.json
```

Replay mode has no upstream URL and therefore cannot silently fall back to the network.

## Inspect

```bash
node packages/cli/dist/index.js inspect ./fixtures/get-latest-ledger/example.json
```

## Current matching rules

Requests match on:

1. JSON-RPC method
2. canonicalized JSON parameters

The JSON-RPC request `id` is ignored for matching. During replay the recorded response is rewritten to use the incoming request ID.

## Repository layout

```text
packages/core    cassette schema, canonicalization, matching
packages/proxy   local record/replay HTTP proxy
packages/cli     stellar-cassette CLI
fixtures         committed Stellar cassette fixtures
examples         integration examples
docs             architecture and format notes
```

## Next implementation checkpoints

1. Verify the transparent proxy against a real Stellar RPC endpoint.
2. Capture a real `getLatestLedger` fixture.
3. Add header forwarding/redaction policy and tests.
4. Deepen fixture coverage for `getLedgerEntries` and `simulateTransaction`.
5. Add deterministic cassette write ordering and atomic writes.
6. Expand sequential/occurrence-aware matching.
7. Add Stellar-aware normalization only after exact replay is stable.

See [ROADMAP.md](./ROADMAP.md).

