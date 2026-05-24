import { describe, expect, it } from 'vitest';
import { previewBytes } from '../src/byteModel';
import { encodeToIbm933, decodeFromIbm933, IBM933_PROFILE } from '../src/codec/ibm933';
import { encodeToIbm935, decodeFromIbm935, IBM935_PROFILE } from '../src/codec/ibm935';
import { inspectIbmDbcs } from '../src/inspector/inspectIbmDbcs';

const koreanSample = '\uD55C\uAD6D\uC5B4\uBB38';
const simplifiedChineseSample = '\u4E2D\u6587\u6D4B\u8BD5';

describe('IBM-933 and IBM-935 DBCS codecs', () => {
  it('roundtrips IBM-933 Korean text with SO/SI wrappers', () => {
    const bytes = encodeToIbm933(`ABC${koreanSample}`);

    expect(Array.from(bytes.slice(0, 4))).toEqual([0xc1, 0xc2, 0xc3, IBM933_PROFILE.so]);
    expect(Array.from(bytes.slice(4, 12))).toEqual([0xd0, 0x65, 0x8a, 0x82, 0xb4, 0xe1, 0xa2, 0x85]);
    expect(bytes[12]).toBe(IBM933_PROFILE.si);
    expect(decodeFromIbm933(bytes)).toBe(`ABC${koreanSample}`);
  });

  it('roundtrips IBM-935 Simplified Chinese text with SO/SI wrappers', () => {
    const bytes = encodeToIbm935(`ABC${simplifiedChineseSample}`);

    expect(Array.from(bytes.slice(0, 4))).toEqual([0xc1, 0xc2, 0xc3, IBM935_PROFILE.so]);
    expect(Array.from(bytes.slice(4, 12))).toEqual([0x5b, 0xcf, 0x57, 0xc3, 0x49, 0xe1, 0x55, 0xd3]);
    expect(bytes[12]).toBe(IBM935_PROFILE.si);
    expect(decodeFromIbm935(bytes)).toBe(`ABC${simplifiedChineseSample}`);
  });

  it('previews and inspects IBM-933 DBCS pairs through the generic byte model', () => {
    const bytes = encodeToIbm933(koreanSample);
    const preview = previewBytes(bytes, 'ibm933');
    const diagnostics = inspectIbmDbcs(IBM933_PROFILE, bytes);

    expect(preview.map(entry => entry.text)).toEqual(['>', ...Array.from(koreanSample), '<']);
    expect(diagnostics.hasProblems).toBe(false);
    expect(diagnostics.counts.DBCS).toBe(4);
    expect(diagnostics.counts.DBCS_AMBIGUOUS).toBe(0);
  });

  it('previews and inspects IBM-935 DBCS pairs through the generic byte model', () => {
    const bytes = encodeToIbm935(simplifiedChineseSample);
    const preview = previewBytes(bytes, 'ibm935');
    const diagnostics = inspectIbmDbcs(IBM935_PROFILE, bytes);

    expect(preview.map(entry => entry.text)).toEqual(['>', ...Array.from(simplifiedChineseSample), '<']);
    expect(diagnostics.hasProblems).toBe(false);
    expect(diagnostics.counts.DBCS).toBe(4);
    expect(diagnostics.counts.DBCS_AMBIGUOUS).toBe(0);
  });
});
