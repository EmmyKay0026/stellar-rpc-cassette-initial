# Matching

The MVP matcher uses:

```text
RPC method + canonicalized JSON params
```

JSON object keys are sorted recursively before comparison. Request IDs do not participate in matching.

When the same logical request appears multiple times, replay consumes matching interactions in sequence so repeated polling or pagination can evolve toward deterministic occurrence-aware behavior.
