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
