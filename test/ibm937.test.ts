import { describe, expect, it } from 'vitest';
import { pairKey } from '../src/dbcsAmbiguousExclusions';
import { decodeFromIbm937, encodeToIbm937, SI, SO } from '../src/codec/ibm937';
import { IBM937_PROFILE } from '../src/codec/ibm937';
import { inspectIbm937 } from '../src/inspector/inspect937';
import { inspectIbmDbcs } from '../src/inspector/inspectIbmDbcs';

describe('IBM-937 codec', () => {
  it('roundtrips SBCS and DBCS text with SO/SI wrappers', () => {
    const bytes = encodeToIbm937('abc測試');

    expect(bytes).toContain(SO);
    expect(bytes).toContain(SI);
    expect(decodeFromIbm937(bytes)).toBe('abc測試');
  });

  it('reports missing SI at EOF', () => {
    const bytes = encodeToIbm937('測試');
    const truncated = bytes.slice(0, bytes.length - 1);
    const result = inspectIbm937(truncated);

    expect(result.hasProblems).toBe(true);
    expect(result.counts.MISSING_SI_AT_EOF).toBe(1);
  });

  it('counts explicit DBCS bytes inside SO/SI as normal DBCS pairs', () => {
    const result = inspectIbm937(Uint8Array.from([SO, 0x5a, 0x61, 0x5d, 0x7c, SI]));

    expect(result.hasProblems).toBe(false);
    expect(result.counts.DBCS).toBe(2);
    expect(result.counts.DBCS_AMBIGUOUS).toBe(0);
  });

  it('reports DBCS ambiguous only when a valid DBCS pair appears in SBCS mode', () => {
    const result = inspectIbm937(Uint8Array.from([0x5a, 0x61, 0x5d, 0x7c]));

    expect(result.hasProblems).toBe(false);
    expect(result.counts.DBCS_AMBIGUOUS).toBe(2);
  });

  it('does not report space padding as DBCS ambiguous', () => {
    const result = inspectIbm937(Uint8Array.from([0x40, 0x40, 0x40, 0x40]));

    expect(result.hasProblems).toBe(false);
    expect(result.counts.DBCS_AMBIGUOUS).toBe(0);
    expect(result.counts.SBCS).toBe(4);
  });

  it('does not report repeated COBOL comment asterisks as DBCS ambiguous', () => {
    const result = inspectIbm937(Uint8Array.from([0x5c, 0x5c, 0x5c, 0x5c, 0x5c, 0x5c]));

    expect(result.hasProblems).toBe(false);
    expect(result.counts.DBCS_AMBIGUOUS).toBe(0);
    expect(result.counts.SBCS).toBe(6);
  });

  it('honors custom DBCS ambiguous exclusions instead of built-in defaults', () => {
    const result = inspectIbmDbcs(IBM937_PROFILE, Uint8Array.from([0x5c, 0x5c]), {
      dbcsAmbiguousExclusions: new Set(),
    });

    expect(result.hasProblems).toBe(false);
    expect(result.counts.DBCS_AMBIGUOUS).toBe(1);
  });

  it('uses custom DBCS ambiguous exclusions for additional byte pairs', () => {
    const result = inspectIbmDbcs(IBM937_PROFILE, Uint8Array.from([0x5a, 0x61]), {
      dbcsAmbiguousExclusions: new Set([pairKey(0x5a, 0x61)]),
    });

    expect(result.hasProblems).toBe(false);
    expect(result.counts.DBCS_AMBIGUOUS).toBe(0);
    expect(result.counts.SBCS).toBe(2);
  });

  it('does not report private-use DBCS mappings as normal DBCS ambiguous candidates', () => {
    const result = inspectIbm937(Uint8Array.from([0xd3, 0xc9]));

    expect(result.hasProblems).toBe(false);
    expect(result.counts.DBCS_AMBIGUOUS).toBe(0);
    expect(result.counts.SBCS).toBe(2);
  });

  it('does not report alphanumeric SBCS text pairs as DBCS ambiguous', () => {
    const result = inspectIbm937(Uint8Array.from([0x4d, 0xc3]));

    expect(result.hasProblems).toBe(false);
    expect(result.counts.DBCS_AMBIGUOUS).toBe(0);
    expect(result.counts.SBCS).toBe(2);
  });

  it('reports an unmatched SI as an SO/SI structure problem', () => {
    const result = inspectIbm937(Uint8Array.from([0x5a, 0x61, 0x5d, 0x7c, SI]));

    expect(result.hasProblems).toBe(true);
    expect(result.counts.UNMATCHED_SI).toBe(1);
  });

  it('reports a duplicate SO as an SO/SI structure problem', () => {
    const result = inspectIbm937(Uint8Array.from([SO, SO, 0x5a, 0x61, SI]));

    expect(result.hasProblems).toBe(true);
    expect(result.counts.UNMATCHED_SO).toBe(1);
  });
});
