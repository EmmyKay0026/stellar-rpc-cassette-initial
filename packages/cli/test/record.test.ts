import { describe, expect, it } from 'vitest';
import { runRecord } from '../src/commands/record.js';

describe('record command wrapper', () => {
  it('injects STELLAR_RPC_URL and returns the child exit status', async () => {
    await expect(
      runRecord({
        upstream: 'http://127.0.0.1:1',
        cassette: 'wrapper-test.json',
        host: '127.0.0.1',
        port: '0',
        command: [
          process.execPath,
          '-e',
          "if (!process.env.STELLAR_RPC_URL?.startsWith('http://127.0.0.1:')) process.exit(2)",
        ],
      }),
    ).resolves.toBeUndefined();
    expect(process.exitCode).toBeUndefined();
  });
});
