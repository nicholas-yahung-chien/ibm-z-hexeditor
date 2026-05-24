import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { previewBytes } from '../src/byteModel';
import { IBM1364_PROFILE } from '../src/codec/ibm1364';
import { IBM1371_PROFILE } from '../src/codec/ibm1371';
import { IBM1388_PROFILE } from '../src/codec/ibm1388';
import { IBM1390_PROFILE } from '../src/codec/ibm1390';
import { IBM1399_PROFILE } from '../src/codec/ibm1399';
import { inspectIbmDbcs, type AnalysisResult } from '../src/inspector/inspectIbmDbcs';

describe('SOAIPB1 second batch IBM DBCS fixtures', () => {
  it.each([
    ['ibm1364', IBM1364_PROFILE, '\uD55C\uAD6D\uC5B4\uBB38'],
    ['ibm1371', IBM1371_PROFILE, '\u6E2C\u8A66\u4E00\u4E0B'],
    ['ibm1388', IBM1388_PROFILE, '\u4E2D\u56FD\u6C49\u5B57'],
    ['ibm1390', IBM1390_PROFILE, '\u65E5\u672C\u8A9E\u6587'],
    ['ibm1399', IBM1399_PROFILE, '\u65E5\u672C\u8A9E\u6587'],
  ])('keeps %s fixture SO/SI structure valid', (encoding, profile, expectedText) => {
    const bytes = readFileSync(`test/fixtures/SOAIPB1.${encoding}.cpy`);
    const result = inspectIbmDbcs(profile, bytes);

    expectValidFixture(result);
    expect(previewDbcsText(bytes, encoding)).toBe(expectedText);
  });
});

function expectValidFixture(result: AnalysisResult): void {
  expect(result.hasProblems).toBe(false);
  expect(result.counts.SO).toBe(1);
  expect(result.counts.SI).toBe(1);
  expect(result.counts.DBCS).toBe(4);
  expect(result.counts.MISSING_SO).toBe(0);
  expect(result.counts.MISSING_SI).toBe(0);
  expect(result.counts.MISSING_SI_AT_EOF).toBe(0);
  expect(result.counts.UNMATCHED_SO).toBe(0);
  expect(result.counts.UNMATCHED_SI).toBe(0);
  expect(result.counts.INVALID_OR_UNKNOWN).toBe(0);
}

function previewDbcsText(bytes: Uint8Array, encoding: string): string {
  return previewBytes(bytes, encoding)
    .filter(entry => entry.kind === 'dbcs')
    .map(entry => entry.text)
    .join('');
}
