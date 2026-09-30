import { describe, expect, it } from 'vitest';
import {
  appendInteraction,
  canonicalJson,
  createCassette,
  findInteraction,
  requestsMatch,
  type JsonRpcRequest,
} from '../src/index.js';

describe('canonical matching', () => {
  it('sorts object keys deterministically', () => {
    expect(canonicalJson({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
  });

  it('ignores JSON-RPC id while matching', () => {
    const a: JsonRpcRequest = { jsonrpc: '2.0', id: 1, method: 'getLatestLedger', params: {} };
    const b: JsonRpcRequest = { jsonrpc: '2.0', id: 49, method: 'getLatestLedger', params: {} };
    expect(requestsMatch(a, b)).toBe(true);
  });

  it('throws a strict cassette miss', () => {
    const cassette = createCassette();
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'simulateTransaction',
      params: { transaction: 'AAAA...' },
    };

    expect(() => findInteraction(cassette, request)).toThrow('CASSETTE MISS');
  });
  it('consumes duplicate requests sequentially', () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'getLatestLedger',
      params: {},
    };
    const first = appendInteraction(createCassette(), {
      request,
      response: { jsonrpc: '2.0', id: 1, result: { sequence: 1 } },
    });
    const cassette = appendInteraction(first, {
      request,
      response: { jsonrpc: '2.0', id: 2, result: { sequence: 2 } },
    });

    expect(findInteraction(cassette, request).sequence).toBe(1);
    expect(findInteraction(cassette, request, new Set([1])).sequence).toBe(2);
  });
});
