# Architecture

Stellar RPC Cassette runs as a local JSON-RPC proxy rather than wrapping one SDK. Any client that can change its RPC URL can use it.

## Record mode

```text
Application / SDK -> local cassette proxy -> real Stellar RPC
                                  |
                                  +-> cassette JSON
```

## Replay mode

```text
Application / SDK -> local cassette proxy -> cassette matcher -> recorded response
```

Replay mode receives no upstream URL. A cassette miss returns an error and never performs an outbound fallback request.

## Credential forwarding

In record mode, the proxy forwards incoming `Authorization`, `Cookie`, and `X-API-Key` headers to the upstream RPC endpoint. These headers are transport-only and are never written to cassette files. Replay mode does not forward request headers or configure an upstream endpoint.
