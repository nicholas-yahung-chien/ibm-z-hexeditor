import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { previewBytes } from '../src/byteModel';
import { IBM933_PROFILE } from '../src/codec/ibm933';
import { IBM935_PROFILE } from '../src/codec/ibm935';
import { inspectIbmDbcs, type AnalysisResult } from '../src/inspector/inspectIbmDbcs';

describe('SOAIPB1 IBM-933 and IBM-935 fixtures', () => {
  it('keeps IBM-933 fixture SO/SI structure valid', () => {
    const bytes = readFileSync('test/fixtures/SOAIPB1.ibm933.cpy');
    const result = inspectIbmDbcs(IBM933_PROFILE, bytes);

    expectValidFixture(result);
    expect(previewDbcsText(bytes, 'ibm933')).toBe('\uD55C\uAD6D\uC5B4\uBB38');
  });

  it('keeps IBM-935 fixture SO/SI structure valid', () => {
    const bytes = readFileSync('test/fixtures/SOAIPB1.ibm935.cpy');
    const result = inspectIbmDbcs(IBM935_PROFILE, bytes);

    expectValidFixture(result);
    expect(previewDbcsText(bytes, 'ibm935')).toBe('\u4E2D\u6587\u6D4B\u8BD5');
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
