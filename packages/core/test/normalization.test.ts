import { describe, expect, it } from 'vitest';
import { NormalizationRegistry, type JsonRpcRequest, type JsonRpcResponse } from '../src/index.js';

const request: JsonRpcRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'getLatestLedger',
  params: {},
};

const response: JsonRpcResponse = {
  jsonrpc: '2.0',
  id: 1,
  result: { sequence: 123, closeTime: '1700000000' },
};

describe('method-aware normalization', () => {
  it('leaves values unchanged when no explicit rule is registered', () => {
    const registry = new NormalizationRegistry();

    expect(registry.normalizeRequest(request)).toBe(request);
    expect(registry.normalizeResponse(request.method, response)).toBe(response);
    expect(registry.has(request.method, 'response')).toBe(false);
  });

  it('applies only the registered method and direction', () => {
    const registry = new NormalizationRegistry().register({
      method: 'getLatestLedger',
      response: (value) => ({
        ...(value as JsonRpcResponse),
        result: { sequence: '<normalized>' },
      }),
    });

    const normalized = registry.normalizeResponse(request.method, response);
    expect(normalized).toMatchObject({ result: { sequence: '<normalized>' } });
    expect(registry.normalizeResponse('getLedgerEntries', response)).toBe(response);
    expect(registry.normalizeRequest(request)).toBe(request);
    expect(response).toMatchObject({ result: { sequence: 123 } });
  });

  it('rejects empty and duplicate method rules', () => {
    const registry = new NormalizationRegistry();
    expect(() => registry.register({ method: '  ' })).toThrow('must not be empty');
    registry.register({ method: 'simulateTransaction' });
    expect(() => registry.register({ method: 'simulateTransaction' })).toThrow(
      'already registered',
    );
  });
});
