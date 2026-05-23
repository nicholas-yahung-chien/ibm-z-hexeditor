import { describe, expect, it } from 'vitest';
import { decodeFromIbm937, encodeToIbm937, SI, SO } from '../src/codec/ibm937';
import { inspectIbm937 } from '../src/inspector/inspect937';

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
});
