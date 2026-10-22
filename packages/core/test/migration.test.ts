import { describe, expect, it } from 'vitest';
import {
  CassetteSchema,
  CURRENT_CASSETTE_VERSION,
  migrateCassette,
  UnsupportedCassetteVersionError,
} from '../src/index.js';

const interaction = (sequence: number, method: string) => ({
  sequence,
  request: { jsonrpc: '2.0', id: sequence, method, params: {} },
  response: { jsonrpc: '2.0', id: sequence, result: { sequence } },
});

describe('migrateCassette', () => {
  it('treats a fully-formed v1 cassette as already current', () => {
    const v1 = {
      format: 'stellar-rpc-cassette',
      version: 1,
      recordedAt: '2026-09-30T17:17:46.559Z',
      interactions: [interaction(1, 'getLatestLedger')],
    };
    const migrated = migrateCassette(v1);
    expect(migrated.version).toBe(CURRENT_CASSETTE_VERSION);
    expect(migrated.interactions).toHaveLength(1);
    expect(migrated.interactions[0].request.method).toBe('getLatestLedger');
    // Must still satisfy the authoritative schema.
    expect(CassetteSchema.parse(migrated)).toEqual(migrated);
  });

  it('promotes a legacy cassette with no version to v1', () => {
    const legacy = {
      format: 'stellar-rpc-cassette',
      recordedAt: '2020-01-01T00:00:00.000Z',
      interactions: [interaction(1, 'getLedger'), interaction(2, 'getLedgerEntries')],
    };
    const migrated = migrateCassette(legacy);
    expect(migrated.version).toBe(CURRENT_CASSETTE_VERSION);
    expect(migrated.format).toBe('stellar-rpc-cassette');
    // Ordering is preserved.
    expect(migrated.interactions.map((i) => i.request.method)).toEqual([
      'getLedger',
      'getLedgerEntries',
    ]);
  });

  it('repairs legacy interactions that are missing sequence numbers', () => {
    const legacy = {
      format: 'stellar-rpc-cassette',
      interactions: [
        {
          request: { jsonrpc: '2.0', method: 'a' },
          response: { jsonrpc: '2.0', result: {} },
        },
        {
          request: { jsonrpc: '2.0', method: 'b' },
          response: { jsonrpc: '2.0', result: {} },
        },
      ],
    };
    const migrated = migrateCassette(legacy);
    expect(migrated.interactions.map((i) => i.sequence)).toEqual([1, 2]);
  });

  it('rejects a future cassette version with an actionable error', () => {
    const future = {
      format: 'stellar-rpc-cassette',
      version: 2,
      recordedAt: '2027-01-01T00:00:00.000Z',
      interactions: [],
    };
    expect(() => migrateCassette(future)).toThrow(UnsupportedCassetteVersionError);
    try {
      migrateCassette(future);
    } catch (error) {
      expect(error).toBeInstanceOf(UnsupportedCassetteVersionError);
      expect((error as UnsupportedCassetteVersionError).message).toContain('v2');
    }
  });

  it('rejects non-object input', () => {
    expect(() => migrateCassette(null)).toThrow(/parsed JSON object/);
    expect(() => migrateCassette('nope')).toThrow(/parsed JSON object/);
  });
});
