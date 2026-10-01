# Roadmap

## M1 — Transparent proxy

- [x] Local HTTP JSON-RPC server
- [x] Forward requests to upstream in record mode
- [x] Validate against a real Stellar SDK and public RPC endpoint

## M2 — Recording

- [x] Versioned JSON cassette schema
- [x] Record successful JSON-RPC responses
- [x] Persist sequence/order
- [x] Serialize concurrent cassette updates without losing interactions
- [x] Atomic cassette writes
- [x] Preserve and test RPC error responses deeply
- [x] Forward credentials upstream without persisting them in cassettes

## M3 — Offline replay

- [x] Strict replay with no upstream fallback
- [x] Canonical request matching
- [x] Ignore request ID during matching
- [x] Restore incoming request ID in response
- [x] Sequential consumption for duplicate requests
- [x] Test sequential consumption for duplicate requests
- [x] Explicit replay matching modes

## M4 — Stellar-aware behavior

- [x] `getLatestLedger` real fixture
- [x] `getLedgerEntries` real fixture
- [x] `simulateTransaction` real fixture
- [x] Method-aware normalization framework
- [ ] XDR inspection/normalization helpers
- [ ] `getEvents` pagination replay

## M5 — Developer-ready v0.1

- [x] CLI: `record`, `replay`, `inspect`
- [x] CI, linting, formatting, tests, build
- [ ] `stellar-cassette record -- <test command>` workflow
- [ ] install/publish packaging
- [ ] tagged v0.1 release

## M6 — Maintainer-ready project

Create contributor issues only after the core workflow is proven against real Stellar calls. Good follow-on issues include normalizers, pagination, migrations, diffing, adapters, validation, sanitization, compatibility testing, and performance work.
