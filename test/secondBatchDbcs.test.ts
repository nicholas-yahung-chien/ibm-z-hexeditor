import { describe, expect, it } from 'vitest';
import { previewBytes } from '../src/byteModel';
import { encodeToIbm1364, decodeFromIbm1364, IBM1364_PROFILE } from '../src/codec/ibm1364';
import { encodeToIbm1371, decodeFromIbm1371, IBM1371_PROFILE } from '../src/codec/ibm1371';
import { encodeToIbm1388, decodeFromIbm1388, IBM1388_PROFILE } from '../src/codec/ibm1388';
import { encodeToIbm1390, decodeFromIbm1390, IBM1390_PROFILE } from '../src/codec/ibm1390';
import { encodeToIbm1399, decodeFromIbm1399, IBM1399_PROFILE } from '../src/codec/ibm1399';
import { inspectIbmDbcs } from '../src/inspector/inspectIbmDbcs';

const koreanSample = '\uD55C\uAD6D\uC5B4\uBB38';
const traditionalChineseSample = '\u6E2C\u8A66\u4E00\u4E0B';
const simplifiedChineseSample = '\u4E2D\u56FD\u6C49\u5B57';
const japaneseSample = '\u65E5\u672C\u8A9E\u6587';

describe('second batch IBM DBCS codecs', () => {
  it('roundtrips IBM-1364 Korean text', () => {
    const bytes = encodeToIbm1364(`ABC${koreanSample}`);

    expect(Array.from(bytes.slice(0, 4))).toEqual([0xc1, 0xc2, 0xc3, IBM1364_PROFILE.so]);
    expect(Array.from(bytes.slice(4, 12))).toEqual([0xd0, 0x65, 0x8a, 0x82, 0xb4, 0xe1, 0xa2, 0x85]);
    expect(bytes[12]).toBe(IBM1364_PROFILE.si);
    expect(decodeFromIbm1364(bytes)).toBe(`ABC${koreanSample}`);
  });

  it('roundtrips IBM-1371 Traditional Chinese text', () => {
    const bytes = encodeToIbm1371(`ABC${traditionalChineseSample}`);

    expect(Array.from(bytes.slice(0, 4))).toEqual([0xc1, 0xc2, 0xc3, IBM1371_PROFILE.so]);
    expect(Array.from(bytes.slice(4, 12))).toEqual([0x5a, 0x61, 0x5d, 0x7c, 0x4c, 0x41, 0x4c, 0x56]);
    expect(bytes[12]).toBe(IBM1371_PROFILE.si);
    expect(decodeFromIbm1371(bytes)).toBe(`ABC${traditionalChineseSample}`);
  });

  it('roundtrips IBM-1388 Simplified Chinese text', () => {
    const bytes = encodeToIbm1388(`ABC${simplifiedChineseSample}`);

    expect(Array.from(bytes.slice(0, 4))).toEqual([0xc1, 0xc2, 0xc3, IBM1388_PROFILE.so]);
    expect(Array.from(bytes.slice(4, 12))).toEqual([0x5b, 0xcf, 0x4d, 0x9b, 0x4d, 0xb9, 0x5c, 0x76]);
    expect(bytes[12]).toBe(IBM1388_PROFILE.si);
    expect(decodeFromIbm1388(bytes)).toBe(`ABC${simplifiedChineseSample}`);
  });

  it('roundtrips IBM-1390 Japanese text', () => {
    const bytes = encodeToIbm1390(`ABC${japaneseSample}`);

    expect(Array.from(bytes.slice(0, 4))).toEqual([0xc1, 0xc2, 0xc3, IBM1390_PROFILE.so]);
    expect(Array.from(bytes.slice(4, 12))).toEqual([0x45, 0x62, 0x45, 0x66, 0x48, 0xe7, 0x45, 0xca]);
    expect(bytes[12]).toBe(IBM1390_PROFILE.si);
    expect(decodeFromIbm1390(bytes)).toBe(`ABC${japaneseSample}`);
  });

  it('roundtrips IBM-1399 Japanese text', () => {
    const bytes = encodeToIbm1399(`ABC${japaneseSample}`);

    expect(Array.from(bytes.slice(0, 4))).toEqual([0xc1, 0xc2, 0xc3, IBM1399_PROFILE.so]);
    expect(Array.from(bytes.slice(4, 12))).toEqual([0x45, 0x62, 0x45, 0x66, 0x48, 0xe7, 0x45, 0xca]);
    expect(bytes[12]).toBe(IBM1399_PROFILE.si);
    expect(decodeFromIbm1399(bytes)).toBe(`ABC${japaneseSample}`);
  });

  it.each([
    ['ibm1364', IBM1364_PROFILE, koreanSample],
    ['ibm1371', IBM1371_PROFILE, traditionalChineseSample],
    ['ibm1388', IBM1388_PROFILE, simplifiedChineseSample],
    ['ibm1390', IBM1390_PROFILE, japaneseSample],
    ['ibm1399', IBM1399_PROFILE, japaneseSample],
  ])('previews and inspects %s DBCS pairs', (encoding, profile, sample) => {
    const bytes = encodeForEncoding(encoding, sample);
    const preview = previewBytes(bytes, encoding);
    const diagnostics = inspectIbmDbcs(profile, bytes);

    expect(preview.map(entry => entry.text)).toEqual(['>', ...Array.from(sample), '<']);
    expect(diagnostics.hasProblems).toBe(false);
    expect(diagnostics.counts.DBCS).toBe(4);
    expect(diagnostics.counts.DBCS_AMBIGUOUS).toBe(0);
  });
});

function encodeForEncoding(encoding: string, sample: string): Uint8Array {
  switch (encoding) {
    case 'ibm1364': return encodeToIbm1364(sample);
    case 'ibm1371': return encodeToIbm1371(sample);
    case 'ibm1388': return encodeToIbm1388(sample);
    case 'ibm1390': return encodeToIbm1390(sample);
    case 'ibm1399': return encodeToIbm1399(sample);
    default: throw new Error(`Unexpected encoding: ${encoding}`);
  }
}
