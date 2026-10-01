import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { startProxy } from '@stellar-rpc-cassette/proxy';

export interface RecordOptions {
  upstream: string;
  cassette: string;
  host: string;
  port: string;
  command?: string[];
}

export async function runRecord(options: RecordOptions): Promise<void> {
  const cassettePath = resolve(options.cassette);
  const server = await startProxy({
    mode: 'record',
    upstream: options.upstream,
    cassettePath,
    host: options.host,
    port: Number(options.port),
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    await closeServer(server);
    throw new Error('Unable to determine the recording proxy address.');
  }
  const rpcUrl = 'http://' + address.address + ':' + address.port;

  if (!options.command?.length) {
    console.log('Stellar RPC Cassette recording on ' + rpcUrl);
    console.log('Upstream: ' + options.upstream);
    console.log('Cassette: ' + cassettePath);
    return;
  }

  console.log('Stellar RPC Cassette recording on ' + rpcUrl);
  const [executable, ...args] = options.command;
  const child = spawn(executable, args, {
    stdio: 'inherit',
    env: { ...process.env, STELLAR_RPC_URL: rpcUrl },
  });

  try {
    const exitCode = await new Promise<number>((resolveExit, reject) => {
      child.once('error', reject);
      child.once('exit', (code, signal) => {
        if (signal) {
          process.kill(process.pid, signal);
          resolveExit(1);
        } else {
          resolveExit(code ?? 1);
        }
      });
    });
    if (exitCode !== 0) process.exitCode = exitCode;
  } finally {
    await closeServer(server);
  }
}

async function closeServer(server: {
  close(callback: (error?: Error) => void): void;
}): Promise<void> {
  await new Promise<void>((resolveClose, reject) => {
    server.close((error) => (error ? reject(error) : resolveClose()));
  });
}
