import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { rpc } from '@stellar/stellar-sdk';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { startProxy } from '../src/index.js';

const servers: Array<ReturnType<typeof createServer>> = [];

afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
  );
});

async function listen(server: ReturnType<typeof createServer>): Promise<number> {
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP address');
  return address.port;
}

describe('record and replay proxy', () => {
  it('records then replays with a different incoming id', async () => {
    const upstream = createServer(async (req, res) => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const request = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { id: number };
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: { sequence: 123456 } }));
    });
    const upstreamPort = await listen(upstream);

    const dir = await mkdtemp(join(tmpdir(), 'stellar-cassette-'));
    const cassettePath = join(dir, 'ledger.json');
    const recordServer = await startProxy({
      mode: 'record',
      upstream: `http://127.0.0.1:${upstreamPort}`,
      cassettePath,
      port: 0,
    });
    servers.push(recordServer);
    const recordAddress = recordServer.address();
    if (!recordAddress || typeof recordAddress === 'string')
      throw new Error('Expected TCP address');

    const recordedResponse = await fetch(`http://127.0.0.1:${recordAddress.port}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getLatestLedger', params: {} }),
    }).then((response) => response.json());

    expect(recordedResponse).toMatchObject({ id: 1, result: { sequence: 123456 } });
    expect(JSON.parse(await readFile(cassettePath, 'utf8')).interactions).toHaveLength(1);

    await new Promise<void>((resolve) => upstream.close(() => resolve()));
    servers.splice(servers.indexOf(upstream), 1);

    const replayServer = await startProxy({ mode: 'replay', cassettePath, port: 0 });
    servers.push(replayServer);
    const replayAddress = replayServer.address();
    if (!replayAddress || typeof replayAddress === 'string')
      throw new Error('Expected TCP address');

    const replayedResponse = await fetch(`http://127.0.0.1:${replayAddress.port}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 49, method: 'getLatestLedger', params: {} }),
    }).then((response) => response.json());

    expect(replayedResponse).toMatchObject({ id: 49, result: { sequence: 123456 } });
  });
  it('records concurrent requests without losing interactions', async () => {
    const upstream = createServer(async (req, res) => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const request = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
        id: number;
        params: { index: number };
      };
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: request.params }));
    });
    const upstreamPort = await listen(upstream);
    const dir = await mkdtemp(join(tmpdir(), 'stellar-cassette-concurrent-'));
    const cassettePath = join(dir, 'nested', 'concurrent.json');
    const recordServer = await startProxy({
      mode: 'record',
      upstream: `http://127.0.0.1:${upstreamPort}`,
      cassettePath,
      port: 0,
    });
    servers.push(recordServer);
    const address = recordServer.address();
    if (!address || typeof address === 'string') throw new Error('Expected TCP address');

    await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        fetch(`http://127.0.0.1:${address.port}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: index,
            method: 'getLedgerEntries',
            params: { index },
          }),
        }),
      ),
    );

    const cassette = JSON.parse(await readFile(cassettePath, 'utf8')) as {
      interactions: Array<{ sequence: number }>;
    };
    expect(cassette.interactions).toHaveLength(20);
    expect(cassette.interactions.map(({ sequence }) => sequence)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
  });
  it('replays a real getLatestLedger fixture through the Stellar SDK without upstream access', async () => {
    let upstreamContacts = 0;
    const forbiddenUpstream = createServer((_req, res) => {
      upstreamContacts += 1;
      res.statusCode = 500;
      res.end('Replay must never contact upstream');
    });
    const upstreamPort = await listen(forbiddenUpstream);
    const cassettePath = fileURLToPath(
      new URL('../../../fixtures/get-latest-ledger/testnet.json', import.meta.url),
    );
    const replayServer = await startProxy({
      mode: 'replay',
      cassettePath,
      upstream: `http://127.0.0.1:${upstreamPort}`,
      port: 0,
    });
    servers.push(replayServer);
    const address = replayServer.address();
    if (!address || typeof address === 'string') throw new Error('Expected TCP address');

    const client = new rpc.Server(`http://127.0.0.1:${address.port}`, { allowHttp: true });
    const ledger = await client.getLatestLedger();

    expect(ledger.sequence).toBeGreaterThan(0);
    expect(ledger.id).toMatch(/^[a-f\d]{64}$/);
    expect(ledger.protocolVersion).toBeGreaterThan(0);
    expect(upstreamContacts).toBe(0);
  });
  it('records and replays JSON-RPC errors with the incoming request id', async () => {
    const upstream = createServer((_req, res) => {
      res.setHeader('content-type', 'application/json');
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          error: { code: -32042, message: 'simulation rejected', data: { reason: 'test' } },
        }),
      );
    });
    const upstreamPort = await listen(upstream);
    const dir = await mkdtemp(join(tmpdir(), 'stellar-cassette-rpc-error-'));
    const cassettePath = join(dir, 'rpc-error.json');
    const recordServer = await startProxy({
      mode: 'record',
      upstream: `http://127.0.0.1:${upstreamPort}`,
      cassettePath,
      port: 0,
    });
    servers.push(recordServer);
    const recordAddress = recordServer.address();
    if (!recordAddress || typeof recordAddress === 'string')
      throw new Error('Expected TCP address');

    const request = { jsonrpc: '2.0', id: 1, method: 'simulateTransaction', params: {} };
    const recorded = await fetch(`http://127.0.0.1:${recordAddress.port}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
    }).then((response) => response.json());
    expect(recorded).toMatchObject({
      id: 1,
      error: { code: -32042, message: 'simulation rejected', data: { reason: 'test' } },
    });

    const cassette = JSON.parse(await readFile(cassettePath, 'utf8')) as {
      interactions: Array<{ response: unknown }>;
    };
    expect(cassette.interactions[0]?.response).toEqual(recorded);

    const replayServer = await startProxy({ mode: 'replay', cassettePath, port: 0 });
    servers.push(replayServer);
    const replayAddress = replayServer.address();
    if (!replayAddress || typeof replayAddress === 'string')
      throw new Error('Expected TCP address');

    const replayed = await fetch(`http://127.0.0.1:${replayAddress.port}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...request, id: 77 }),
    }).then((response) => response.json());
    expect(replayed).toMatchObject({
      id: 77,
      error: { code: -32042, message: 'simulation rejected', data: { reason: 'test' } },
    });
  });
  it('forwards credentials upstream without persisting them in the cassette', async () => {
    let receivedHeaders: Record<string, string | string[] | undefined> = {};
    const upstream = createServer((_req, res) => {
      receivedHeaders = _req.headers;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { sequence: 42 } }));
    });
    const upstreamPort = await listen(upstream);
    const dir = await mkdtemp(join(tmpdir(), 'stellar-cassette-credentials-'));
    const cassettePath = join(dir, 'credentials.json');
    const recordServer = await startProxy({
      mode: 'record',
      upstream: `http://127.0.0.1:${upstreamPort}`,
      cassettePath,
      port: 0,
    });
    servers.push(recordServer);
    const address = recordServer.address();
    if (!address || typeof address === 'string') throw new Error('Expected TCP address');

    await fetch(`http://127.0.0.1:${address.port}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer super-secret-token',
        cookie: 'session=super-secret-cookie',
        'x-api-key': 'super-secret-api-key',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getLatestLedger' }),
    });

    expect(receivedHeaders.authorization).toBe('Bearer super-secret-token');
    expect(receivedHeaders.cookie).toBe('session=super-secret-cookie');
    expect(receivedHeaders['x-api-key']).toBe('super-secret-api-key');

    const cassetteText = await readFile(cassettePath, 'utf8');
    expect(cassetteText).not.toContain('super-secret-token');
    expect(cassetteText).not.toContain('super-secret-cookie');
    expect(cassetteText).not.toContain('super-secret-api-key');
    expect(cassetteText.toLowerCase()).not.toContain('authorization');
    expect(cassetteText.toLowerCase()).not.toContain('x-api-key');
  });
});
