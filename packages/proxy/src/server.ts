import { createServer, type Server } from 'node:http';
import { CassetteMissError } from '@stellar-rpc-cassette/core';
import { readJsonBody, sendJson } from './http.js';
import { recordInteraction } from './record.js';
import { createReplaySession } from './replay.js';

export type ProxyMode = 'record' | 'replay';

export interface ProxyOptions {
  mode: ProxyMode;
  cassettePath: string;
  upstream?: string;
  host?: string;
  port?: number;
  forwardHeaders?: Record<string, string>;
}

export async function startProxy(options: ProxyOptions): Promise<Server> {
  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? 6969;
  const replay = createReplaySession();

  if (options.mode === 'record' && !options.upstream) {
    throw new Error('Record mode requires an upstream Stellar RPC URL.');
  }

  const server = createServer(async (req, res) => {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Only POST JSON-RPC requests are supported.' });
      return;
    }

    try {
      const request = await readJsonBody(req);
      const result =
        options.mode === 'record'
          ? await recordInteraction({
              upstream: options.upstream!,
              cassettePath: options.cassettePath,
              request,
              headers: options.forwardHeaders,
            })
          : await replay({ cassettePath: options.cassettePath, request });

      sendJson(res, 200, result);
    } catch (error) {
      if (error instanceof CassetteMissError) {
        sendJson(res, 409, {
          jsonrpc: '2.0',
          error: { code: -32090, message: error.message },
        });
        return;
      }

      const message = error instanceof Error ? error.message : 'Unknown proxy error';
      sendJson(res, 500, {
        jsonrpc: '2.0',
        error: { code: -32603, message },
      });
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolve();
    });
  });

  return server;
}
