import { describe, expect, it } from 'vitest';
import { encodeToIbm937, SO } from '../src/codec/ibm937';
import { roundTripTextConversion } from '../src/textRoundTrip';

describe('text-converted save round-trip validation', () => {
  it('accepts IBM DBCS bytes that round-trip exactly', () => {
    const bytes = encodeToIbm937('ABC測試');

    const result = roundTripTextConversion(bytes, 'ibm937');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.encoded).toEqual(bytes);
      expect(result.text).toBe('ABC測試');
    }
  });

  it('rejects bytes that would be changed by text conversion', () => {
    const bytes = encodeToIbm937('測試').slice(1);
    expect(bytes[0]).not.toBe(SO);

    const result = roundTripTextConversion(bytes, 'ibm937');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('mismatch');
      expect(result.mismatchOffset).toBeTypeOf('number');
    }
  });

  it('rejects unsupported encodings', () => {
    const result = roundTripTextConversion(Uint8Array.from([0x41]), 'utf8');

    expect(result).toEqual({ ok: false, reason: 'unsupported-encoding' });
  });

  it('rejects fixed records because text upload cannot preserve MVS record boundaries', () => {
    const first = encodeToIbm937('ABC').slice(0, 3);
    const second = encodeToIbm937('DEF').slice(0, 3);
    const bytes = Uint8Array.from([...first, ...second]);

    const result = roundTripTextConversion(bytes, 'ibm937', {
      source: 'zowe',
      recordFormat: 'FB',
      logicalRecordLength: 3,
    });

    expect(result).toEqual({ ok: false, reason: 'fixed-record-unsupported' });
  });
});
