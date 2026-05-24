import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { previewBytes } from '../src/byteModel';
import { IBM930_PROFILE } from '../src/codec/ibm930';
import { IBM939_PROFILE } from '../src/codec/ibm939';
import { inspectIbmDbcs, type AnalysisResult } from '../src/inspector/inspectIbmDbcs';

const expectedDbcsText = '\u65e5\u672c\u8a9e\u6587';

describe('SOAIPB1 Japanese IBM DBCS fixtures', () => {
  it('keeps IBM-930 fixture SO/SI structure valid', () => {
    const bytes = readFileSync('test/fixtures/SOAIPB1.ibm930.cpy');
    const result = inspectIbmDbcs(IBM930_PROFILE, bytes);

    expectValidFixture(result);
    expect(previewDbcsText(bytes, 'ibm930')).toBe(expectedDbcsText);
  });

  it('keeps IBM-939 fixture SO/SI structure valid', () => {
    const bytes = readFileSync('test/fixtures/SOAIPB1.ibm939.cpy');
    const result = inspectIbmDbcs(IBM939_PROFILE, bytes);

    expectValidFixture(result);
    expect(previewDbcsText(bytes, 'ibm939')).toBe(expectedDbcsText);
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
