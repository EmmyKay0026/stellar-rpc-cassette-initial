import { canonicalJson } from './canonicalize.js';
import { CassetteMissError } from './errors.js';
import type { Cassette, CassetteInteraction, JsonRpcRequest } from './types.js';

export function requestsMatch(
  recorded: Pick<JsonRpcRequest, 'method' | 'params'>,
  incoming: Pick<JsonRpcRequest, 'method' | 'params'>,
): boolean {
  return (
    recorded.method === incoming.method &&
    canonicalJson(recorded.params ?? {}) === canonicalJson(incoming.params ?? {})
  );
}

export function findInteraction(
  cassette: Cassette,
  incoming: JsonRpcRequest,
  consumedSequences: ReadonlySet<number> = new Set(),
): CassetteInteraction {
  const match = cassette.interactions.find(
    (interaction) =>
      !consumedSequences.has(interaction.sequence) && requestsMatch(interaction.request, incoming),
  );

  if (!match) {
    throw new CassetteMissError(incoming);
  }

  return match;
}
