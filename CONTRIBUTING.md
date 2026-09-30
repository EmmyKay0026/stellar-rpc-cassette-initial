# Contributing

Thanks for contributing to Stellar RPC Cassette.

## Development

```bash
corepack enable
pnpm install
pnpm check
```

Keep changes small and testable. The project intentionally earns complexity gradually: exact JSON-RPC record/replay comes before method-specific Stellar normalization.

## Pull requests

A PR should include:

- a clear problem statement;
- tests for changed behavior;
- docs when behavior or CLI usage changes;
- no committed credentials or provider secrets.
