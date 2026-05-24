import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getDiagnosticHeaderCounts } from '../src/diagnosticsSummary';
import { inspectIbm937 } from '../src/inspector/inspect937';

const fixtureBytes = () => readFileSync('test/fixtures/SOAIPB1.ibm937.cpy');

describe('SOAIPB1 IBM-937 fixture regressions', () => {
  it('keeps confirmed DBCS pairs limited to explicit SO/SI mode', () => {
    const result = inspectIbm937(fixtureBytes());

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
  });

  it('keeps DBCS ambiguous warnings conservative for COBOL-like text', () => {
    const result = inspectIbm937(fixtureBytes());
    const ambiguousEvents = result.events.filter(event => event.kind === 'DBCS_AMBIGUOUS');

    expect(result.counts.DBCS_AMBIGUOUS).toBe(27);
    expect(ambiguousEvents.every(event => event.bytesHex !== '5C 5C')).toBe(true);
    expect(ambiguousEvents.every(event => event.decodedText.codePointAt(0)! < 0xE000 || event.decodedText.codePointAt(0)! > 0xF8FF)).toBe(true);
  });

  it('summarizes header counts without adding ambiguous warnings to DBCS pairs', () => {
    const result = inspectIbm937(fixtureBytes());
    const headerCounts = getDiagnosticHeaderCounts(result);

    expect(headerCounts.problemCount).toBe(0);
    expect(headerCounts.dbcsPairCount).toBe(4);
    expect(headerCounts.warningCount).toBe(27);
  });
});
