import { resolve } from 'node:path';
import { type ReplayMatchMode } from '@stellar-rpc-cassette/core';
import { startProxy } from '@stellar-rpc-cassette/proxy';

export async function runReplay(options: {
  cassette: string;
  host: string;
  port: string;
  matchMode: string;
}): Promise<void> {
  if (options.matchMode !== 'sequential' && options.matchMode !== 'strict') {
    throw new Error('Replay match mode must be either sequential or strict.');
  }

  const cassettePath = resolve(options.cassette);
  await startProxy({
    mode: 'replay',
    cassettePath,
    host: options.host,
    port: Number(options.port),
    replayMatchMode: options.matchMode as ReplayMatchMode,
  });

  console.log(`Stellar RPC Cassette replaying on http://${options.host}:${options.port}`);
  console.log(`Cassette: ${cassettePath}`);
  console.log('Strict replay mode: no upstream fallback is configured.');
}
