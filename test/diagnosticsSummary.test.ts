import { describe, expect, it } from 'vitest';
import { countDiagnosticProblems, countDiagnosticWarnings, summarizeProblemCounts } from '../src/diagnosticsSummary';
import { SI, SO } from '../src/codec/ibm937';
import { inspectIbm937 } from '../src/inspector/inspect937';

describe('diagnostics summary', () => {
  it('counts structural problems separately from warnings', () => {
    const result = inspectIbm937(Uint8Array.from([0x5a, 0x61, 0x5d, 0x7c, SI]));

    expect(countDiagnosticProblems(result)).toBe(1);
    expect(countDiagnosticWarnings(result)).toBe(2);
    expect(summarizeProblemCounts(result)).toBe('Unmatched SI: 1');
  });

  it('does not warn explicit DBCS pairs inside SO/SI mode', () => {
    const result = inspectIbm937(Uint8Array.from([SO, 0x5a, 0x61, 0x5d, 0x7c, SI]));

    expect(countDiagnosticProblems(result)).toBe(0);
    expect(countDiagnosticWarnings(result)).toBe(0);
    expect(summarizeProblemCounts(result)).toBe('');
  });

  it('counts DBCS ambiguous pairs as warnings in SBCS mode', () => {
    const result = inspectIbm937(Uint8Array.from([0x5a, 0x61, 0x5d, 0x7c]));

    expect(countDiagnosticProblems(result)).toBe(0);
    expect(countDiagnosticWarnings(result)).toBe(2);
    expect(summarizeProblemCounts(result)).toBe('');
  });
});
