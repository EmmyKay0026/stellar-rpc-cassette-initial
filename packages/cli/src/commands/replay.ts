import { resolve } from 'node:path';
import { startProxy } from '@stellar-rpc-cassette/proxy';

export async function runReplay(options: {
  cassette: string;
  host: string;
  port: string;
}): Promise<void> {
  const cassettePath = resolve(options.cassette);
  await startProxy({
    mode: 'replay',
    cassettePath,
    host: options.host,
    port: Number(options.port),
  });

  console.log(`Stellar RPC Cassette replaying on http://${options.host}:${options.port}`);
  console.log(`Cassette: ${cassettePath}`);
  console.log('Strict replay mode: no upstream fallback is configured.');
}
