import { describe, expect, it } from 'vitest';
import { inspectBase64Xdr, isBase64Xdr, normalizeBase64Xdr } from '../src/index.js';

describe('raw XDR helpers', () => {
  it('inspects and canonicalizes base64 without decoding its type', () => {
    const inspection = inspectBase64Xdr(' AQID ');

    expect(inspection).toEqual({ encoding: 'base64', byteLength: 3, canonical: 'AQID' });
    expect(normalizeBase64Xdr('AQID')).toBe('AQID');
  });

  it('rejects malformed or empty XDR values', () => {
    expect(() => inspectBase64Xdr('')).toThrow('non-empty');
    expect(() => inspectBase64Xdr('not base64')).toThrow();
    expect(isBase64Xdr('AQID')).toBe(true);
    expect(isBase64Xdr('bad*')).toBe(false);
    expect(isBase64Xdr(null)).toBe(false);
  });

  it('preserves a representative Stellar raw XDR value', () => {
    const value =
      'AAAAAgAAAAAg4dbAxsGAGICfBG3iT2cKGYQ6hK4sJWzZ6or1C5v6GAAAAGQAJsOiAAAAEQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAGAAAAAAAAAABzAP+dP0PsNzYvFF1pv7a8RQXwH5eg3uZBbbWjE9PwAsAAAAJaW5jcmVtZW50AAAAAAAAAgAAABIAAAAAAAAAACDh1sDGwYAYgJ8EbeJPZwoZhDqEriwlbNnqivULm/oYAAAAAwAAAAMAAAAAAAAAAAAAAAA=';

    expect(normalizeBase64Xdr(value)).toBe(value);
    expect(inspectBase64Xdr(value).byteLength).toBeGreaterThan(100);
  });
});
