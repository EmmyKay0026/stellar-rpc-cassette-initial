import {
  appendInteraction,
  createCassette,
  JsonRpcRequestSchema,
  JsonRpcResponseSchema,
  loadCassette,
  saveCassette,
} from '@stellar-rpc-cassette/core';
import { access } from 'node:fs/promises';

const cassetteWriteQueues = new Map<string, Promise<void>>();

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function recordInteraction(options: {
  upstream: string;
  cassettePath: string;
  request: unknown;
  headers?: Record<string, string>;
}): Promise<unknown> {
  const request = JsonRpcRequestSchema.parse(options.request);

  const response = await fetch(options.upstream, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(options.headers ?? {}),
    },
    body: JSON.stringify(request),
  });

  const responseBody = JsonRpcResponseSchema.parse(await response.json());
  const previousWrite = cassetteWriteQueues.get(options.cassettePath) ?? Promise.resolve();
  const currentWrite = previousWrite
    .catch(() => undefined)
    .then(async () => {
      const cassette = (await exists(options.cassettePath))
        ? await loadCassette(options.cassettePath)
        : createCassette();

      const updated = appendInteraction(cassette, {
        request,
        response: responseBody,
      });

      await saveCassette(options.cassettePath, updated);
    });

  cassetteWriteQueues.set(options.cassettePath, currentWrite);

  try {
    await currentWrite;
  } finally {
    if (cassetteWriteQueues.get(options.cassettePath) === currentWrite) {
      cassetteWriteQueues.delete(options.cassettePath);
    }
  }

  return responseBody;
}
