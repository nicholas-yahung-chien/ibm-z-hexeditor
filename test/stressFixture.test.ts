import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cellsFromBytes, makeSnapshot } from '../src/byteModel';

describe('IBM-937 stress fixture', () => {
  it('loads a 1200-line IBM-937 file with valid SO/SI structure', () => {
    const bytes = readFileSync('test/fixtures/SOAIPB1.ibm937.stress-1200.cpy');
    const snapshot = makeSnapshot({
      uri: 'file:///SOAIPB1.ibm937.stress-1200.cpy',
      fileName: 'SOAIPB1.ibm937.stress-1200.cpy',
      fileEncoding: 'ibm937',
      cells: cellsFromBytes(bytes),
      dirty: false,
    });

    expect(bytes.length).toBeGreaterThan(80_000);
    expect(snapshot.lines).toHaveLength(1200);
    expect(snapshot.cells).toHaveLength(bytes.length);
    expect(snapshot.diagnostics?.hasProblems).toBe(false);
    expect(snapshot.diagnostics?.counts.SO).toBe(120);
    expect(snapshot.diagnostics?.counts.SI).toBe(120);
    expect(snapshot.diagnostics?.counts.DBCS).toBe(720);
  });
});
