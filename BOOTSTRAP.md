# Bootstrap checklist

Use this after extracting the starter ZIP.

```bash
git init
git branch -M main
corepack enable
pnpm install
pnpm check
# Commit the generated pnpm-lock.yaml after the first install
```

Then create the first commit:

```bash
git add .
git commit -m "chore: bootstrap Stellar RPC Cassette"
```

The first real end-to-end checkpoint is a `getLatestLedger` recording against a Stellar testnet RPC, followed by replay with the upstream unavailable.
