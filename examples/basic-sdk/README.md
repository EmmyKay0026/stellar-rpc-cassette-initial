# Basic SDK example

This flow is validated with the official `@stellar/stellar-sdk` against the committed testnet fixtures at `fixtures/get-latest-ledger/testnet.json` and `fixtures/get-ledger-entries/testnet-account.json`.

The target flow is:

1. start `stellar-cassette record`;
2. configure the SDK RPC URL as `http://127.0.0.1:6969`;
3. call `getLatestLedger`;
4. stop recording;
5. disable/kill the upstream RPC path;
6. start `stellar-cassette replay`;
7. repeat the SDK call successfully from the cassette.

The automated integration test starts a replay proxy, calls getLatestLedger through the SDK, and verifies that a deliberately failing upstream server receives zero requests.
