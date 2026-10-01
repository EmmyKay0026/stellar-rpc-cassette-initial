import { canonicalJson } from './canonicalize.js';
import { CassetteMissError } from './errors.js';
import type { Cassette, CassetteInteraction, JsonRpcRequest } from './types.js';

export type ReplayMatchMode = 'sequential' | 'strict';

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
  mode: ReplayMatchMode = 'sequential',
): CassetteInteraction {
  const candidates = cassette.interactions.filter(
    (interaction) => !consumedSequences.has(interaction.sequence),
  );
  const match =
    mode === 'strict'
      ? candidates[0] && requestsMatch(candidates[0].request, incoming)
        ? candidates[0]
        : undefined
      : candidates.find((interaction) => requestsMatch(interaction.request, incoming));

  if (!match) throw new CassetteMissError(incoming);

  return match;
}
