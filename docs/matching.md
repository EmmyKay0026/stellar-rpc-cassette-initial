# Matching

The MVP matcher uses:

```text
RPC method + canonicalized JSON params
```

JSON object keys are sorted recursively before comparison. Request IDs do not participate in matching.

When the same logical request appears multiple times, replay consumes matching interactions in sequence so repeated polling or pagination can evolve toward deterministic occurrence-aware behavior.

## Replay modes

`sequential` is the default. It finds the next unused cassette interaction whose method and canonicalized parameters match the incoming request. This supports deterministic polling and pagination even when unrelated requests are interleaved.

`strict` requires the incoming request to match the next unused interaction in cassette sequence. Use it when a test should also verify the complete order of RPC calls.

Both modes consume an interaction at most once. A cassette miss never falls back to the network.
