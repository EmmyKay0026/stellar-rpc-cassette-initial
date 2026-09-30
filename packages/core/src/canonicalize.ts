import { createHash } from 'node:crypto';
import type { JsonRpcRequest } from './types.js';

function canonicalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizeValue);
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonicalizeValue(item)]),
    );
  }

  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalizeValue(value));
}

export function requestFingerprint(request: Pick<JsonRpcRequest, 'method' | 'params'>): string {
  return createHash('sha256')
    .update(request.method)
    .update('\n')
    .update(canonicalJson(request.params ?? {}))
    .digest('hex');
}
