import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { makeSnapshot, previewBytes } from '../src/byteModel';
import { getIbmDbcsProfile } from '../src/codePages';
import { getDiagnosticHeaderCounts } from '../src/diagnosticsSummary';
import { inspectIbmDbcs, type AnalysisResult } from '../src/inspector/inspectIbmDbcs';

interface DbcsFixtureCase {
  encoding: string;
  expectedText: string;
  expectedDbcsPairs?: number;
  minDbcsPairs?: number;
}

interface SbcsFixtureCase {
  encoding: string;
  expectedPreview: string;
}

const dbcsFixtures: DbcsFixtureCase[] = [
  { encoding: 'ibm930', expectedText: '\u65E5\u672C\u8A9E\u6587', expectedDbcsPairs: 4 },
  { encoding: 'ibm933', expectedText: '\uD55C\uAD6D\uC5B4\uBB38', expectedDbcsPairs: 4 },
  { encoding: 'ibm935', expectedText: '\u4E2D\u6587\u6D4B\u8BD5', expectedDbcsPairs: 4 },
  // The IBM-937 fixture is also used for manual editor validation, so keep this
  // case focused on structural guarantees while still requiring real DBCS text.
  { encoding: 'ibm937', expectedText: '\u6E2C\u8A66', minDbcsPairs: 4 },
  { encoding: 'ibm939', expectedText: '\u65E5\u672C\u8A9E\u6587', expectedDbcsPairs: 4 },
  { encoding: 'ibm1364', expectedText: '\uD55C\uAD6D\uC5B4\uBB38', expectedDbcsPairs: 4 },
  { encoding: 'ibm1371', expectedText: '\u6E2C\u8A66\u4E00\u4E0B', expectedDbcsPairs: 4 },
  { encoding: 'ibm1388', expectedText: '\u4E2D\u56FD\u6C49\u5B57', expectedDbcsPairs: 4 },
  { encoding: 'ibm1390', expectedText: '\u65E5\u672C\u8A9E\u6587', expectedDbcsPairs: 4 },
  { encoding: 'ibm1399', expectedText: '\u65E5\u672C\u8A9E\u6587', expectedDbcsPairs: 4 },
];

const sbcsFixtures: SbcsFixtureCase[] = [
  { encoding: 'ibm37', expectedPreview: 'HELLO WORLD.ABC' },
  { encoding: 'ibm500', expectedPreview: 'HELLO WORLD.ABC' },
  { encoding: 'ibm1047', expectedPreview: 'HELLO WORLD.ABC' },
  { encoding: 'ibm1140', expectedPreview: 'HELLO WORLD \u20AC.ABC' },
];

describe('supported IBM code page fixture matrix', () => {
  it.each(dbcsFixtures)('keeps $encoding DBCS fixture structurally valid', fixture => {
    const bytes = readFileSync(`test/fixtures/SOAIPB1.${fixture.encoding}.cpy`);
    const profile = getIbmDbcsProfile(fixture.encoding);

    expect(profile).toBeDefined();
    const result = inspectIbmDbcs(profile!, bytes);
    const snapshot = makeSnapshot({
      uri: `file:///SOAIPB1.${fixture.encoding}.cpy`,
      fileName: `SOAIPB1.${fixture.encoding}.cpy`,
      fileEncoding: fixture.encoding,
      cells: Array.from(bytes, value => ({ value })),
      dirty: false,
    });

    expectValidDbcsFixture(result);
    expect(snapshot.diagnostics).not.toBeNull();
    expect(snapshot.lines.length).toBeGreaterThan(1);
    expect(snapshot.cells).toHaveLength(bytes.length);
    expect(previewDbcsText(bytes, fixture.encoding)).toContain(fixture.expectedText);

    if (fixture.expectedDbcsPairs !== undefined) {
      expect(result.counts.DBCS).toBe(fixture.expectedDbcsPairs);
    }
    if (fixture.minDbcsPairs !== undefined) {
      expect(result.counts.DBCS).toBeGreaterThanOrEqual(fixture.minDbcsPairs);
    }

    const headerCounts = getDiagnosticHeaderCounts(result);
    expect(headerCounts.problemCount).toBe(0);
    expect(headerCounts.dbcsPairCount).toBe(result.counts.DBCS);
    expect(headerCounts.warningCount).toBe(result.counts.DBCS_AMBIGUOUS);
  });

  it.each(sbcsFixtures)('keeps $encoding SBCS fixture as raw-byte-only data', fixture => {
    const bytes = readFileSync(`test/fixtures/HELLO.${fixture.encoding}.cpy`);
    const snapshot = makeSnapshot({
      uri: `file:///HELLO.${fixture.encoding}.cpy`,
      fileName: `HELLO.${fixture.encoding}.cpy`,
      fileEncoding: fixture.encoding,
      cells: Array.from(bytes, value => ({ value })),
      dirty: false,
    });

    expect(snapshot.diagnostics).toBeNull();
    expect(getDiagnosticHeaderCounts(snapshot.diagnostics)).toEqual({
      problemCount: 0,
      dbcsPairCount: 0,
      warningCount: 0,
    });
    expect(snapshot.lines.map(line => [line.startOffset, line.length])).toEqual([[0, bytes.length - 3], [bytes.length - 3, 3]]);
    expect(snapshot.preview.map(entry => entry.text).join('')).toBe(fixture.expectedPreview);
    expect(snapshot.preview.every(entry => entry.kind !== 'dbcs')).toBe(true);
    expect(snapshot.cells).toHaveLength(bytes.length);
  });
});

function expectValidDbcsFixture(result: AnalysisResult): void {
  expect(result.hasProblems).toBe(false);
  expect(result.counts.SO).toBe(1);
  expect(result.counts.SI).toBe(1);
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
