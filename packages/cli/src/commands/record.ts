import { resolve } from 'node:path';
import { startProxy } from '@stellar-rpc-cassette/proxy';

export async function runRecord(options: {
  upstream: string;
  cassette: string;
  host: string;
  port: string;
}): Promise<void> {
  const cassettePath = resolve(options.cassette);
  await startProxy({
    mode: 'record',
    upstream: options.upstream,
    cassettePath,
    host: options.host,
    port: Number(options.port),
  });

  console.log(`Stellar RPC Cassette recording on http://${options.host}:${options.port}`);
  console.log(`Upstream: ${options.upstream}`);
  console.log(`Cassette: ${cassettePath}`);
}
