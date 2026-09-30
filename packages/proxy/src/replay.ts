import {
  findInteraction,
  JsonRpcRequestSchema,
  loadCassette,
  type JsonRpcId,
} from '@stellar-rpc-cassette/core';

function withIncomingId(response: Record<string, unknown>, id: JsonRpcId | undefined): unknown {
  if (id === undefined) return response;
  return { ...response, id };
}

export function createReplaySession() {
  const consumed = new Set<number>();

  return async function replayInteraction(options: {
    cassettePath: string;
    request: unknown;
  }): Promise<unknown> {
    const request = JsonRpcRequestSchema.parse(options.request);
    const cassette = await loadCassette(options.cassettePath);
    const interaction = findInteraction(cassette, request, consumed);
    consumed.add(interaction.sequence);

    return withIncomingId(interaction.response as Record<string, unknown>, request.id);
  };
}
