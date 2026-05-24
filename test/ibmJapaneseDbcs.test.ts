import { describe, expect, it } from 'vitest';
import { previewBytes } from '../src/byteModel';
import { encodeToIbm930, decodeFromIbm930, IBM930_PROFILE } from '../src/codec/ibm930';
import { encodeToIbm939, decodeFromIbm939, IBM939_PROFILE } from '../src/codec/ibm939';
import { inspectIbmDbcs } from '../src/inspector/inspectIbmDbcs';

describe('Japanese IBM DBCS codecs', () => {
  it('roundtrips IBM-930 Japanese text with SO/SI wrappers', () => {
    const bytes = encodeToIbm930('ABC日本語');

    expect(Array.from(bytes.slice(0, 4))).toEqual([0xc1, 0xc2, 0xc3, IBM930_PROFILE.so]);
    expect(Array.from(bytes.slice(4, 10))).toEqual([0x45, 0x62, 0x45, 0x66, 0x48, 0xe7]);
    expect(bytes[10]).toBe(IBM930_PROFILE.si);
    expect(decodeFromIbm930(bytes)).toBe('ABC日本語');
  });

  it('roundtrips IBM-939 Japanese text with SO/SI wrappers', () => {
    const bytes = encodeToIbm939('ABC日本語');

    expect(Array.from(bytes.slice(0, 4))).toEqual([0xc1, 0xc2, 0xc3, IBM939_PROFILE.so]);
    expect(Array.from(bytes.slice(4, 10))).toEqual([0x45, 0x62, 0x45, 0x66, 0x48, 0xe7]);
    expect(bytes[10]).toBe(IBM939_PROFILE.si);
    expect(decodeFromIbm939(bytes)).toBe('ABC日本語');
  });

  it('previews and inspects IBM-939 DBCS pairs through the generic byte model', () => {
    const bytes = encodeToIbm939('日本語');
    const preview = previewBytes(bytes, 'ibm939');
    const diagnostics = inspectIbmDbcs(IBM939_PROFILE, bytes);

    expect(preview.map(entry => entry.text)).toEqual(['>', '日', '本', '語', '<']);
    expect(diagnostics.hasProblems).toBe(false);
    expect(diagnostics.counts.DBCS).toBe(3);
    expect(diagnostics.counts.DBCS_AMBIGUOUS).toBe(0);
  });
});
