export interface XdrInspection {
  encoding: 'base64';
  byteLength: number;
  canonical: string;
}

function decodeBase64(value: string): Buffer {
  const compact = value.replace(/\s+/g, '');
  if (!compact || compact.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(compact)) {
    throw new Error('XDR value must be non-empty canonical base64.');
  }

  const decoded = Buffer.from(compact, 'base64');
  if (decoded.length === 0 || decoded.toString('base64') !== compact) {
    throw new Error('XDR value must be valid base64 with canonical padding.');
  }
  return decoded;
}

/** Inspect raw base64 XDR without decoding its Stellar-specific type. */
export function inspectBase64Xdr(value: string): XdrInspection {
  const bytes = decodeBase64(value);
  return {
    encoding: 'base64',
    byteLength: bytes.length,
    canonical: bytes.toString('base64'),
  };
}

/** Return canonical base64 while preserving the raw XDR bytes exactly. */
export function normalizeBase64Xdr(value: string): string {
  return inspectBase64Xdr(value).canonical;
}

export function isBase64Xdr(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    (() => {
      try {
        inspectBase64Xdr(value);
        return true;
      } catch {
        return false;
      }
    })()
  );
}
