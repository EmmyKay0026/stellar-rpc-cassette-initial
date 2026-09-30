# agent.md — Stellar RPC Cassette

This file defines the operating rules for AI coding agents working in this repository.

## 1. Project mission

**Stellar RPC Cassette** is deterministic record-and-replay testing infrastructure for Stellar JSON-RPC applications.

The product should let developers:

1. point an existing Stellar application or SDK at a local proxy;
2. record real Stellar JSON-RPC interactions once;
3. save those interactions in a versioned cassette;
4. replay the same interactions deterministically and offline in tests and CI.

The project is deliberately SDK-agnostic. JavaScript, Rust, Python, Go, or any other Stellar client should be able to use it by changing only the RPC URL.

The core promise is:

> Record real Stellar JSON-RPC interactions once and replay them deterministically without depending on a live RPC endpoint.

---

## 2. Non-goals

Do **not** turn this project into:

- a Stellar RPC implementation;
- another Stellar SDK;
- a generic HTTP recorder;
- a blockchain simulator;
- a Stellar explorer;
- an RPC provider;
- a wallet testing framework;
- a replacement for Stellar Quickstart.

Every feature should strengthen one or more of these concerns:

- deterministic recording;
- deterministic replay;
- request matching;
- Stellar-aware normalization;
- sanitization/redaction;
- cassette debugging and inspection;
- offline test reliability.

If a proposed change does not clearly support those goals, do not add it without explicit approval.

---

## 3. Technology choices

Use the established stack unless a task explicitly requires otherwise:

- TypeScript
- Node.js
- pnpm
- pnpm workspaces
- Vitest
- Zod
- Commander
- Node built-in `http`
- native `fetch`
- `@stellar/stellar-sdk`
- tsup
- ESLint
- Prettier
- GitHub Actions

Avoid adding dependencies when the platform or existing dependencies already solve the problem cleanly.

Before introducing a new production dependency, explain why it is necessary.

---

## 4. Repository architecture

The repository is organized around three primary packages:

```text
packages/
├── core/
│   └── src/
│       ├── cassette.ts
│       ├── matcher.ts
│       ├── canonicalize.ts
│       ├── errors.ts
│       └── index.ts
│
├── proxy/
│   └── src/
│       ├── server.ts
│       ├── record.ts
│       ├── replay.ts
│       └── index.ts
│
└── cli/
    └── src/
        ├── commands/
        │   ├── record.ts
        │   ├── replay.ts
        │   └── inspect.ts
        └── index.ts
```

Supporting directories include:

```text
fixtures/
examples/
docs/
.github/workflows/
```

### Package responsibilities

#### `packages/core`

Owns logic that does not require an HTTP server:

- cassette schema;
- cassette validation;
- canonical JSON handling;
- request fingerprints/matching;
- occurrence/sequential matching;
- cassette errors;
- format-version handling;
- future normalization primitives.

`core` must not depend on `proxy` or `cli`.

#### `packages/proxy`

Owns runtime transport behavior:

- local JSON-RPC HTTP server;
- upstream forwarding in record mode;
- recording interactions;
- replaying interactions;
- enforcing zero-network replay;
- request/response transport concerns;
- redaction at the proxy boundary.

It may depend on `core`.

#### `packages/cli`

Owns user-facing commands and argument parsing:

- `stellar-cassette record`
- `stellar-cassette replay`
- `stellar-cassette inspect`

It should orchestrate `core` and `proxy`, not duplicate their logic.

---

## 5. Architectural invariants

These rules are mandatory.

### 5.1 Replay must never silently access the network

Replay mode is strict.

If no cassette interaction matches, return a cassette-miss error.

Never:

- fall back to an upstream RPC endpoint;
- make a hidden network request;
- retry against the network;
- silently switch into record mode.

A test must exist that uses an upstream server which fails immediately if contacted during replay.

### 5.2 JSON-RPC `id` is not part of matching

Requests with different JSON-RPC IDs but the same method and canonical params are logically equivalent for matching.

Match using:

```text
method
+
canonicalized params
```

When replaying, the response must use the **incoming request ID**, not the ID captured during recording.

### 5.3 Canonical JSON must be deterministic

Object key order must not affect matching.

For example:

```json
{ "b": 2, "a": 1 }
```

must match:

```json
{ "a": 1, "b": 2 }
```

Canonicalization must be recursive and deterministic.

Do not mutate semantic array ordering.

### 5.4 Cassette format must be versioned

Every cassette must declare at minimum:

```json
{
  "format": "stellar-rpc-cassette",
  "version": 1
}
```

Reject malformed cassettes and unsupported versions with clear errors.

Never make breaking cassette-format changes without:

1. updating the versioning strategy;
2. adding tests;
3. updating `docs/cassette-format.md`;
4. considering migration behavior.

### 5.5 Preserve raw Stellar RPC representations

If Stellar RPC returns raw/base64 XDR, preserve that representation in the cassette.

Do not replace authoritative cassette data with decoded human-readable forms.

Future Stellar-aware handling should follow:

```text
raw RPC value
↓
optional decoder
↓
semantic normalization
↓
comparison / inspection
```

### 5.6 Normalization must be explicit

Do not normalize changing fields merely because they look unstable.

Some changing values are exactly what a developer may want to test.

Normalization must be:

- method-aware;
- explicit;
- deterministic;
- documented;
- tested.

Build exact record/replay before adding sophisticated normalization.

### 5.7 Security belongs in v0.1

Recording must never persist sensitive provider credentials.

Redact at least:

- `Authorization`
- `Cookie`
- `X-API-Key`

The proxy may forward real credentials upstream, but they must not appear in cassette files.

Any new metadata capture must be reviewed for secret leakage.

---

## 6. Cassette model

A cassette should conceptually resemble:

```json
{
  "format": "stellar-rpc-cassette",
  "version": 1,
  "recordedAt": "2026-09-30T14:00:00Z",
  "network": {
    "passphrase": "Test SDF Network ; September 2015"
  },
  "interactions": [
    {
      "sequence": 1,
      "request": {
        "jsonrpc": "2.0",
        "method": "getLatestLedger",
        "params": {}
      },
      "response": {
        "result": {
          "sequence": 123456
        }
      }
    }
  ]
}
```

The exact schema may evolve, but changes must preserve the invariants in this file.

---

## 7. Matching behavior

The initial matcher should use exact semantic matching:

```text
RPC method
+
canonicalized JSON params
```

Possible internal fingerprint:

```text
SHA256(method + canonicalJson(params))
```

A hash is an implementation detail, not the semantic definition of a match.

### Repeated requests

Applications may send identical requests multiple times.

The implementation should support deterministic repeated-request behavior using a clear strategy such as sequential interaction consumption or occurrence counters.

Do not return the first identical cassette entry forever.

Pagination and polling depend on occurrence-aware replay.

---

## 8. Record-mode behavior

The record pipeline is:

```text
request arrives
↓
forward exact request upstream
↓
receive upstream response
↓
sanitize sensitive metadata
↓
canonicalize stored request metadata
↓
append interaction
↓
persist cassette deterministically
↓
return response to application
```

Recording must support both successful JSON-RPC responses and JSON-RPC error responses.

Do not alter the application-visible response unnecessarily.

---

## 9. Replay-mode behavior

The replay pipeline is:

```text
incoming request
↓
canonicalize method + params
↓
find next matching recorded interaction
↓
restore incoming JSON-RPC request ID
↓
return recorded result/error
```

On failure, produce a useful cassette-miss error containing enough information to debug the mismatch.

Replay mode must remain strict and must not contact an upstream RPC endpoint.

Never expose secrets in diagnostic output.

---

## 10. First Stellar methods

Prioritize deep support and fixtures for:

1. `getLatestLedger`
2. `getLedgerEntries`
3. `simulateTransaction`

After these are solid, expand toward `getEvents`, pagination, transaction lookups, and additional Stellar-aware normalization.

---

## 11. Implementation order

Unless a task explicitly targets a later feature, prefer this order:

1. Foundation: workspace, TypeScript, lint, format, tests, build, CI, docs.
2. Transparent proxy.
3. Recording.
4. Strict offline replay.
5. Repeated/sequential matching.
6. Redaction.
7. Stellar fixtures.
8. Stellar-aware normalization.

Do not skip ahead to advanced normalization before exact record/replay is reliable.

---

## 12. First end-to-end checkpoint

The most important early integration target is:

```bash
stellar-cassette record \
  --upstream https://soroban-testnet.stellar.org \
  --cassette get-latest-ledger.json
```

A Stellar client sends `getLatestLedger`, and the interaction is recorded.

Then network access is blocked and the same request is replayed with:

```bash
stellar-cassette replay \
  --cassette get-latest-ledger.json
```

The request must succeed entirely from the cassette.

That proves the fundamental architecture.

---

## 13. Testing requirements

Every behavior change should include or update tests.

At minimum, cover:

- proxy forwarding;
- successful recording;
- RPC error recording;
- exact replay;
- request ID ignored during matching;
- incoming request ID restored in response;
- canonical object key ordering;
- cassette miss;
- malformed cassette;
- unsupported cassette version;
- duplicate requests;
- sequential request consumption;
- `Authorization` redaction;
- API key redaction;
- upstream server failure;
- replay without network access;
- deterministic cassette output.

### Critical offline test

Create an upstream server or function that throws immediately if contacted.

Run replay against a valid cassette.

The replay must succeed without touching that upstream.

This test protects one of the project's core promises and should never be weakened.

---

## 14. Determinism rules

Generated cassette output should be reproducible where practical.

Avoid introducing nondeterminism through:

- unordered object serialization;
- random identifiers in stored interactions;
- environment-specific absolute paths;
- unnecessary timestamps inside interaction payloads;
- unstable ordering of metadata.

When timestamps are required, distinguish useful recording metadata from data used for matching.

---

## 15. CLI design rules

The CLI should remain thin and composable.

Primary commands:

```bash
stellar-cassette record
stellar-cassette replay
stellar-cassette inspect
```

Long-term command-wrapper target:

```bash
stellar-cassette record -- npm test
stellar-cassette replay -- npm test
```

For command-wrapping workflows, the CLI should:

```text
start proxy
↓
inject STELLAR_RPC_URL
↓
launch child command
↓
wait for completion
↓
stop proxy
↓
return child-process exit code
```

Preserve Ctrl+C and termination behavior correctly.

---

## 16. Error handling

Errors must be actionable.

Prefer domain-specific errors for:

- cassette miss;
- malformed cassette;
- unsupported cassette version;
- cassette file read/write failure;
- invalid JSON-RPC payload;
- upstream unavailable;
- proxy bind failure.

Do not bury failures behind generic messages.

Do not include secrets in errors.

---

## 17. Documentation rules

Update documentation whenever user-visible behavior changes.

Relevant docs include:

```text
README.md
docs/architecture.md
docs/cassette-format.md
docs/matching.md
docs/normalization.md
ROADMAP.md
```

Examples must match the actual CLI and current schema.

Do not document planned behavior as though it already exists.

Clearly distinguish implemented, experimental, and planned behavior.

---

## 18. Dependency and complexity discipline

Keep the project small until complexity is earned.

Do not:

- split code into additional packages merely for aesthetics;
- introduce frameworks for simple Node HTTP behavior;
- build plugin systems before concrete use cases exist;
- implement generalized abstractions before real consumers require them;
- prematurely normalize every Stellar RPC method.

Prefer straightforward, testable code.

---

## 19. Git and change discipline

When working on a task:

1. inspect the relevant implementation and tests first;
2. make the smallest coherent change;
3. add/update tests;
4. update docs when behavior changes;
5. run validation;
6. summarize exactly what changed.

Do not rewrite unrelated files.

Do not perform broad formatting-only changes unless required.

Do not delete compatibility behavior without explicit justification.

Do not force-push or rewrite repository history unless explicitly instructed.

---

## 20. Required validation

Before declaring a task complete, run the applicable repository checks.

Default full gate:

```bash
pnpm install
pnpm lint
pnpm test
pnpm build
```

If available, also run:

```bash
pnpm typecheck
pnpm format:check
```

Focused tests may be used during development, but the full gate should pass before completion when practical.

If any command cannot be run because of the environment, state exactly which command was not run and why.

Never claim tests passed if they were not executed.

---

## 21. Definition of done

A change is complete only when:

- it satisfies the requested behavior;
- architecture boundaries remain intact;
- replay cannot silently reach the network;
- matching semantics remain deterministic;
- secrets are not persisted;
- relevant tests exist;
- existing tests continue to pass;
- lint/build/type checks pass where applicable;
- user-facing behavior is documented;
- no unrelated code has been changed.

For cassette-format changes, additionally ensure:

- version compatibility was considered;
- schema validation was updated;
- cassette-format documentation was updated;
- migration implications were considered.

---

## 22. Maintainer-readiness

This repository is intended to become a credible Stellar/Drips maintainer project.

Do not manufacture a large issue backlog before the product works.

First establish:

1. repository foundation;
2. JSON-RPC proxy;
3. cassette schema;
4. recording;
5. strict replay;
6. deterministic matching;
7. redaction;
8. real Stellar fixtures;
9. tests;
10. CLI.

Once the product is functional, suitable contributor work includes:

- method-specific Stellar normalizers;
- `getEvents` pagination;
- cassette migration framework;
- cassette diff;
- GitHub Action;
- Vitest adapter;
- Playwright adapter;
- XDR normalization;
- cassette inspector improvements;
- advanced matching;
- RPC compatibility testing;
- sanitization rules;
- fixture validation;
- performance improvements.

Contributor issues should extend a functioning product rather than construct an empty one.

---

## 23. Rules for AI agents

### Before coding

- read this file;
- read the relevant package source;
- read nearby tests;
- inspect `README.md` and relevant docs;
- understand the existing public API before modifying it.

### While coding

- preserve repository architecture;
- avoid speculative refactors;
- prefer explicit code over clever abstractions;
- add tests alongside behavior;
- keep replay strictly offline;
- preserve cassette determinism;
- protect secrets.

### Before finishing

Report:

- files changed;
- behavior implemented;
- tests added or changed;
- validation commands run;
- validation results;
- any limitations or follow-up work.

Never state that a feature is complete when required validation is failing.

---

## 24. Decision rule

When uncertain between two implementations, prefer the one that makes this statement easier to guarantee:

> A Stellar application can record a real RPC interaction once and later replay it deterministically, safely, and with zero network dependency.

That is the project's north star.

For Soroban AuthGuard, every engineering milestone must be isolated in its own Git branch and committed only after the milestone is complete and verified.

## Git workflow rules

Before making any changes for a new milestone:

1. Verify the working tree is clean:

```bash
git status --short
```

If unexpected changes exist, stop and report them. Do not discard or overwrite existing work.

2. Switch to the integration branch:

```bash
git switch main
```

3. Create the milestone branch before editing code.

Branch naming convention:

```text
milestone/NN-short-description
```

Examples:

```text
milestone/02-canonical-authorization-model
milestone/03-semantic-diff-engine
milestone/04-policy-engine
```

4. Perform only the work belonging to that milestone.

Do not mix future milestone work into the current branch.

5. Before committing, run:

```bash
cargo fmt --all -- --check
cargo test --workspace --all-features
cargo clippy --workspace --all-targets --all-features -- -D warnings
```

All checks must pass.

If a check fails, fix the implementation and rerun the complete validation sequence.

Never commit knowingly failing code.

6. Review the final change before committing:

```bash
git status
git diff --stat
git diff
```

Check that:

- files changed belong to the current milestone;
- no generated build artifacts are tracked;
- no secrets or credentials are present;
- unrelated changes are not included;
- documentation is updated where necessary.

7. Stage the milestone:

```bash
git add .
```

Then inspect staged changes:

```bash
git diff --cached --stat
git diff --cached
```

8. Commit the completed milestone using a Conventional Commit message.

Examples:

```text
feat(core): complete canonical authorization model
feat(diff): implement semantic authorization diff engine
feat(policy): implement authorization policy enforcement
feat(cli): complete AuthGuard v0.1 command interface
feat(git): add Git-aware authorization baselines
feat(ci): add GitHub authorization regression gate
test(hardening): add authorization mutation corpus
chore(release): prepare AuthGuard v0.1
docs(contributing): prepare project for Drips contributors
```

Do not make the milestone commit until the implementation and tests are complete.

9. After committing, verify:

```bash
git status
git log --oneline --decorate -3
```

The working tree must be clean.

10. Stop after committing the milestone.

Report:

- branch name;
- commit SHA;
- commit message;
- files changed;
- implementation summary;
- tests run;
- test results;
- known limitations;
- recommended next milestone.

Do NOT automatically begin the next milestone.

Wait for explicit instruction to proceed.

## Important history rule

Never amend, squash, rebase, reset, force-push, or rewrite an already completed milestone unless explicitly instructed.

Completed milestones should remain identifiable in Git history.

## Milestone sequence

Use this sequence unless explicitly changed:

```text
M1  milestone/01-native-snapshot-ingestion
M2  milestone/02-canonical-authorization-model
M3  milestone/03-semantic-diff-engine
M4  milestone/04-policy-engine
M5  milestone/05-cli-v0.1
M6  milestone/06-git-aware-baselines
M7  milestone/07-github-integration
M8  milestone/08-hardening
M9  milestone/09-v0.1-release
M10 milestone/10-drips-readiness
```

Do not create Drips contributor issues during the implementation milestones.

The project must first become a credible working open-source tool.
