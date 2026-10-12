import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { validateCassetteFile } from '../src/commands/validate.js';

// A minimal valid cassette shaped exactly like CassetteSchema.
const validCassette = {
  format: 'stellar-rpc-cassette',
  version: 1,
  recordedAt: '2026-09-30T17:17:46.559Z',
  interactions: [
    {
      sequence: 1,
      request: { jsonrpc: '2.0', id: 1, method: 'getLatestLedger' },
      response: { jsonrpc: '2.0', id: 1, result: {} },
    },
  ],
};

describe('validateCassetteFile', () => {
  let dir: string;
  let path: string;

  const write = async (content: string) => {
    path = join(dir, 'cassette.json');
    await writeFile(path, content, 'utf8');
    return path;
  };

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'cassette-validate-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('accepts a valid cassette', async () => {
    const p = await write(JSON.stringify(validCassette));
    const result = await validateCassetteFile(p);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.interactions).toBe(1);
  });

  it('rejects malformed JSON with a useful message', async () => {
    const p = await write('{ not json');
    const result = await validateCassetteFile(p);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Malformed JSON');
  });

  it('rejects a missing file', async () => {
    const result = await validateCassetteFile(join(dir, 'does-not-exist.json'));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Failed to read cassette');
  });

  it('rejects an unsupported cassette version', async () => {
    const p = await write(JSON.stringify({ ...validCassette, version: 2 }));
    const result = await validateCassetteFile(p);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Unsupported cassette version');
  });

  it('reports invalid schema fields', async () => {
    const p = await write(JSON.stringify({ ...validCassette, format: 'wrong-format' }));
    const result = await validateCassetteFile(p);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.join(' ')).toMatch(/format/);
  });
});
