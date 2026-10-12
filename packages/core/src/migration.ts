import { CassetteInteractionSchema, CassetteSchema, type Cassette } from './types.js';

/** The only cassette format version this toolchain understands. */
export const CURRENT_CASSETTE_VERSION = 1;

/**
 * Raised when a cassette declares a version newer than what this build
 * supports. The message is deliberately actionable so a CLI or UI can
 * surface it verbatim to the user.
 */
export class UnsupportedCassetteVersionError extends Error {
  constructor(
    readonly requested: number,
    readonly supported: number,
  ) {
    super(
      `Unsupported cassette version ${requested}: this build supports version ${supported} ` +
        `or earlier. Upgrade the toolchain that wrote this cassette, or ` +
        `check out a version of stellar-rpc-cassette that knows v${requested}.`,
    );
    this.name = 'UnsupportedCassetteVersionError';
  }
}

interface LegacyCassetteShape {
  format?: unknown;
  version?: unknown;
  recordedAt?: unknown;
  interactions?: unknown;
}

/**
 * Upgrade a cassette of any supported version to the current shape.
 *
 * - Legacy objects (no `version` field, or `version === undefined`) are
 *   promoted to v1: `format` and `recordedAt` default to the canonical
 *   values, interactions are validated individually so a single bad
 *   entry produces a field-level error rather than a whole-file reject.
 * - v1 cassettes pass through the full `CassetteSchema` (field-level
 *   validation + JSON-RPC invariant checks).
 * - Anything above v1 throws `UnsupportedCassetteVersionError`.
 */
export function migrateCassette(raw: unknown): Cassette {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Cassette input must be a parsed JSON object.');
  }
  const obj = raw as LegacyCassetteShape;
  const version = obj.version;

  if (typeof version === 'number' && version > CURRENT_CASSETTE_VERSION) {
    throw new UnsupportedCassetteVersionError(version, CURRENT_CASSETTE_VERSION);
  }

  // Legacy: no version field at all → treat as pre-versioned v1.
  if (version === undefined || version === null) {
    const normalized = {
      format: obj.format === 'stellar-rpc-cassette' ? obj.format : 'stellar-rpc-cassette',
      version: CURRENT_CASSETTE_VERSION,
      recordedAt:
        typeof obj.recordedAt === 'string' ? obj.recordedAt : new Date(0).toISOString(),
      interactions: Array.isArray(obj.interactions)
        ? obj.interactions.map((interaction, index) => {
            const original = (interaction as { sequence?: unknown }).sequence;
            const parsed = CassetteInteractionSchema.parse({
              ...interaction,
              sequence: typeof original === 'number' && original > 0 ? original : index + 1,
            });
            return parsed;
          })
        : [],
    };
    return CassetteSchema.parse(normalized);
  }

  // version === 1 (the only other supported value)
  return CassetteSchema.parse(obj);
}
