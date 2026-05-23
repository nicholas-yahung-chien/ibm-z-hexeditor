import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cellsFromBytes, deleteByte, insertByte, makeSnapshot, previewBytes, replaceNibble } from '../src/byteModel';
import { encodeToIbm937, SO, SI } from '../src/codec/ibm937';

describe('byte-first model', () => {
  it('uses raw bytes for nibble editing', () => {
    const cells = cellsFromBytes(Uint8Array.from([0xc5]));
    const edited = replaceNibble(cells, 0, 'low', 0x0);

    expect(edited).toEqual([{ value: 0xc0 }]);
  });

  it('inserts and deletes raw bytes', () => {
    const cells = cellsFromBytes(Uint8Array.from([0xc1, 0xc2]));
    const inserted = insertByte(cells, 1, 0x0e);
    const deleted = deleteByte(inserted, 2);

    expect(inserted.map(cell => cell.value)).toEqual([0xc1, 0x0e, 0xc2]);
    expect(deleted.map(cell => cell.value)).toEqual([0xc1, 0x0e]);
  });

  it('previews IBM-937 SO/SI DBCS bytes with byte ranges', () => {
    const bytes = encodeToIbm937('A測');
    const preview = previewBytes(bytes, 'ibm937');

    expect(bytes[0]).toBe(0xc1);
    expect(bytes).toContain(SO);
    expect(bytes).toContain(SI);
    expect(preview.map(entry => entry.text)).toEqual(['A', '>', '測', '<']);
    expect(preview[2]).toMatchObject({ byteLength: 2, kind: 'dbcs' });
  });

  it('previews UTF-8 multi-byte characters with byte ranges', () => {
    const bytes = new TextEncoder().encode('A測');
    const preview = previewBytes(bytes, 'utf8');

    expect(preview.map(entry => entry.text)).toEqual(['A', '測']);
    expect(preview[1]).toMatchObject({ byteOffset: 1, byteLength: 3 });
  });

  it('does not flag the IBM-937 COBOL fixture comment asterisks as missing SO', () => {
    const bytes = readFileSync('test/fixtures/SOAIPB1.ibm937.cpy');
    const snapshot = makeSnapshot({
      uri: 'fixture',
      fileName: 'SOAIPB1.ibm937.cpy',
      fileEncoding: 'ibm937',
      cells: cellsFromBytes(bytes),
      dirty: false,
    });

    expect(snapshot.cells).toHaveLength(bytes.length);
    expect(snapshot.preview.slice(0, 12).map(entry => entry.text).join('')).toBe('      ******');
    expect(snapshot.diagnostics?.counts.MISSING_SO).toBe(0);
    expect(snapshot.diagnostics?.counts.MISSING_SI).toBe(0);
    expect(snapshot.diagnostics?.counts.INVALID_OR_UNKNOWN).toBe(0);
    expect((snapshot.diagnostics?.counts.DBCS ?? 0) + (snapshot.diagnostics?.counts.DBCS_AMBIGUOUS ?? 0)).toBe(2);
  });
});
