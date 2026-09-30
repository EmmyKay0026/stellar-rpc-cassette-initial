# Security Policy

## Sensitive data

Never commit provider credentials, API keys, bearer tokens, cookies, private keys, seed phrases, or other secrets in cassette files.

The initial implementation stores only JSON-RPC request/response bodies. Header persistence is intentionally absent. Before any future header or metadata persistence is added, redaction must cover at minimum:

- `Authorization`
- `Cookie`
- `X-API-Key`

If you discover a credential leak or security issue, report it privately to the maintainers rather than opening a public issue containing secrets.
