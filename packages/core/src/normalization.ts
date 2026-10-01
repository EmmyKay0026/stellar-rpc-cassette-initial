import type { JsonRpcRequest, JsonRpcResponse } from './types.js';

export type NormalizationDirection = 'request' | 'response';
export type Normalizer = (value: unknown) => unknown;

export interface NormalizationRule {
  method: string;
  request?: Normalizer;
  response?: Normalizer;
}

/**
 * Explicit, method-aware normalization for inspection and semantic comparison.
 * Raw cassette requests and responses are never modified by this registry.
 */
export class NormalizationRegistry {
  private readonly rules = new Map<string, NormalizationRule>();

  register(rule: NormalizationRule): this {
    if (!rule.method.trim()) throw new Error('Normalization rule method must not be empty.');
    if (this.rules.has(rule.method)) {
      throw new Error(`A normalization rule is already registered for ${rule.method}.`);
    }
    this.rules.set(rule.method, { ...rule });
    return this;
  }

  has(method: string, direction: NormalizationDirection): boolean {
    return this.rules.get(method)?.[direction] !== undefined;
  }

  normalizeRequest(request: JsonRpcRequest): JsonRpcRequest {
    return (this.rules.get(request.method)?.request?.(request) ?? request) as JsonRpcRequest;
  }

  normalizeResponse(method: string, response: JsonRpcResponse): JsonRpcResponse {
    return (this.rules.get(method)?.response?.(response) ?? response) as JsonRpcResponse;
  }
}
