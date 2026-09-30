# Cassette format

The initial format is versioned JSON.

```json
{
  "format": "stellar-rpc-cassette",
  "version": 1,
  "recordedAt": "2026-09-30T14:00:00Z",
  "interactions": [
    {
      "sequence": 1,
      "request": {
        "jsonrpc": "2.0",
        "method": "getLatestLedger",
        "params": {}
      },
      "response": {
        "jsonrpc": "2.0",
        "id": 1,
        "result": {
          "sequence": 123456
        }
      }
    }
  ]
}
```

Raw RPC response values remain authoritative. Human-readable decoding or Stellar-aware normalization should be layered on later rather than replacing the original wire representation.
