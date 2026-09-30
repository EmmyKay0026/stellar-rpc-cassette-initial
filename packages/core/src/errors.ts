import type { JsonRpcRequest } from './types.js';

export class CassetteMissError extends Error {
  constructor(request: Pick<JsonRpcRequest, 'method' | 'params'>) {
    super(
      [
        'CASSETTE MISS',
        '',
        `Method: ${request.method}`,
        `Parameters: ${JSON.stringify(request.params ?? {}, null, 2)}`,
        '',
        'Replay mode is strict.',
        'No network request was performed.',
      ].join('\n'),
    );
    this.name = 'CassetteMissError';
  }
}
