import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildLines, makeSnapshot, previewBytes } from '../src/byteModel';
import {
  getIbmSbcsProfile,
  getIbmSbcsProfiles,
  isIbmSbcsEncoding,
  isSupportedIbmCodePageEncoding,
  normalizeIbmCodePageEncoding,
} from '../src/codePages';
import { decodeFromIbm37, encodeToIbm37, IBM37_PROFILE } from '../src/codec/ibm37';
import { decodeFromIbm500, encodeToIbm500, IBM500_PROFILE } from '../src/codec/ibm500';
import { decodeFromIbm1047, encodeToIbm1047, IBM1047_PROFILE } from '../src/codec/ibm1047';
import { decodeFromIbm1140, encodeToIbm1140, IBM1140_PROFILE } from '../src/codec/ibm1140';

describe('IBM EBCDIC SBCS code page profiles', () => {
  it('registers supported SBCS profiles and normalizes common aliases', () => {
    expect(getIbmSbcsProfiles().map(profile => profile.id)).toEqual(['ibm37', 'ibm500', 'ibm1047', 'ibm1140']);
    expect(getIbmSbcsProfile('IBM-037')).toBe(IBM37_PROFILE);
    expect(getIbmSbcsProfile('cp037')).toBe(IBM37_PROFILE);
    expect(getIbmSbcsProfile('IBM500')).toBe(IBM500_PROFILE);
    expect(getIbmSbcsProfile('cp1047')).toBe(IBM1047_PROFILE);
    expect(getIbmSbcsProfile('IBM-1140')).toBe(IBM1140_PROFILE);
    expect(normalizeIbmCodePageEncoding('CP-037')).toBe('ibm37');
    expect(normalizeIbmCodePageEncoding('IBM-1047')).toBe('ibm1047');
    expect(isIbmSbcsEncoding('ibm1140')).toBe(true);
    expect(isSupportedIbmCodePageEncoding('cp037')).toBe(true);
    expect(isSupportedIbmCodePageEncoding('ibm937')).toBe(true);
  });

  it.each([
    ['ibm37', encodeToIbm37, decodeFromIbm37],
    ['ibm500', encodeToIbm500, decodeFromIbm500],
    ['ibm1047', encodeToIbm1047, decodeFromIbm1047],
    ['ibm1140', encodeToIbm1140, decodeFromIbm1140],
  ])('roundtrips and previews %s Latin text', (encoding, encode, decode) => {
    const bytes = encode('HELLO WORLD');

    expect(Array.from(bytes)).toEqual([0xc8, 0xc5, 0xd3, 0xd3, 0xd6, 0x40, 0xe6, 0xd6, 0xd9, 0xd3, 0xc4]);
    expect(decode(bytes)).toBe('HELLO WORLD');
    expect(previewBytes(bytes, encoding).map(entry => entry.text).join('')).toBe('HELLO WORLD');
  });

  it('uses EBCDIC newline bytes for SBCS row building without DBCS diagnostics', () => {
    const bytes = Uint8Array.from([0xc1, 0xc2, 0xc3, 0x15, 0xc4, 0xc5, 0xc6]);
    const lines = buildLines(bytes, 'ibm37');
    const snapshot = makeSnapshot({
      uri: 'file:///sample.cpy',
      fileName: 'sample.cpy',
      fileEncoding: 'ibm37',
      cells: Array.from(bytes, value => ({ value })),
      dirty: false,
    });

    expect(lines.map(line => [line.startOffset, line.length])).toEqual([[0, 4], [4, 3]]);
    expect(snapshot.diagnostics).toBeNull();
    expect(snapshot.preview.map(entry => entry.text).join('')).toBe('ABC.DEF');
  });

  it('supports the IBM-1140 Euro byte', () => {
    const euroBytes = encodeToIbm1140('€');

    expect(Array.from(euroBytes)).toEqual([0x9f]);
    expect(decodeFromIbm1140(Uint8Array.from([0x9f]))).toBe('€');
  });

  it.each([
    ['ibm37', 'HELLO WORLD.ABC'],
    ['ibm500', 'HELLO WORLD.ABC'],
    ['ibm1047', 'HELLO WORLD.ABC'],
    ['ibm1140', 'HELLO WORLD €.ABC'],
  ])('previews the %s fixture', (encoding, expectedPreview) => {
    const bytes = readFileSync(`test/fixtures/HELLO.${encoding}.cpy`);
    const snapshot = makeSnapshot({
      uri: `file:///HELLO.${encoding}.cpy`,
      fileName: `HELLO.${encoding}.cpy`,
      fileEncoding: encoding,
      cells: Array.from(bytes, value => ({ value })),
      dirty: false,
    });

    expect(snapshot.diagnostics).toBeNull();
    expect(snapshot.lines.length).toBe(2);
    expect(snapshot.preview.map(entry => entry.text).join('')).toBe(expectedPreview);
  });
});
