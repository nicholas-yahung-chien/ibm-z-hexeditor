import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bytesFromCells, cellsFromBytes, deleteByte, insertByte, makeSnapshot, previewBytes, replaceNibble } from '../src/byteModel';
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

  it('keeps fixed records the same length when deleting a byte', () => {
    const cells = cellsFromBytes(Uint8Array.from([0xc1, 0xc2, 0xc3, 0xc4, 0xd1, 0xd2, 0xd3, 0xd4]));
    const deleted = deleteByte(cells, 1, {
      source: 'zowe',
      recordFormat: 'FB',
      logicalRecordLength: 4,
    }, 'ibm937');

    expect(deleted.map(cell => cell.value)).toEqual([0xc1, 0xc3, 0xc4, 0x40, 0xd1, 0xd2, 0xd3, 0xd4]);
    expect(deleted).toHaveLength(cells.length);
  });

  it('keeps fixed records the same length when inserting a byte', () => {
    const cells = cellsFromBytes(Uint8Array.from([0xc1, 0xc2, 0xc3, 0xc4, 0xd1, 0xd2, 0xd3, 0xd4]));
    const inserted = insertByte(cells, 2, 0x00, {
      source: 'zowe',
      recordFormat: 'FB',
      logicalRecordLength: 4,
    }, 'ibm937');

    expect(inserted.map(cell => cell.value)).toEqual([0xc1, 0xc2, 0x00, 0xc3, 0xd1, 0xd2, 0xd3, 0xd4]);
    expect(inserted).toHaveLength(cells.length);
  });

  it('keeps an insert at a fixed-record boundary in the previous record', () => {
    const cells = cellsFromBytes(Uint8Array.from([0xc1, 0xc2, 0xc3, 0xc4, 0xd1, 0xd2, 0xd3, 0xd4]));
    const inserted = insertByte(cells, 4, 0x00, {
      source: 'zowe',
      recordFormat: 'FB',
      logicalRecordLength: 4,
    }, 'ibm937');

    expect(inserted.map(cell => cell.value)).toEqual([0xc1, 0xc2, 0xc3, 0x00, 0xd1, 0xd2, 0xd3, 0xd4]);
    expect(inserted).toHaveLength(cells.length);
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

  it('splits fixed Zowe records by LRECL when bytes have no newline markers', () => {
    const snapshot = makeSnapshot({
      uri: 'inline',
      fileName: 'fixed.cpy',
      fileEncoding: 'ibm937',
      cells: cellsFromBytes(new Uint8Array(165).fill(0x40)),
      dirty: false,
      recordMetadata: {
        source: 'zowe',
        recordFormat: 'FB',
        logicalRecordLength: 80,
        blockSize: 3200,
      },
    });

    expect(snapshot.recordMetadata).toMatchObject({ recordFormat: 'FB', logicalRecordLength: 80 });
    expect(snapshot.lines.map(line => [line.startOffset, line.length])).toEqual([
      [0, 80],
      [80, 80],
      [160, 5],
    ]);
  });

  it('keeps variable Zowe records on the normal newline/no-newline path', () => {
    const snapshot = makeSnapshot({
      uri: 'inline',
      fileName: 'variable.cpy',
      fileEncoding: 'ibm937',
      cells: cellsFromBytes(new Uint8Array(165).fill(0x40)),
      dirty: false,
      recordMetadata: {
        source: 'zowe',
        recordFormat: 'VB',
        logicalRecordLength: 80,
      },
    });

    expect(snapshot.lines).toHaveLength(1);
    expect(snapshot.lines[0]).toMatchObject({ startOffset: 0, length: 165 });
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
    expect((snapshot.diagnostics?.counts.DBCS ?? 0) + (snapshot.diagnostics?.counts.DBCS_AMBIGUOUS ?? 0)).toBeGreaterThan(0);
  });

  it('updates SO/SI diagnostics when SO is deleted and reinserted', () => {
    const bytes = encodeToIbm937('測試');
    const cells = cellsFromBytes(bytes);
    const soOffset = bytes.indexOf(SO);
    const withoutSo = deleteByte(cells, soOffset);
    const broken = makeSnapshot({
      uri: 'inline',
      fileName: 'inline.cpy',
      fileEncoding: 'ibm937',
      cells: withoutSo,
      dirty: true,
    });

    expect(bytes[soOffset]).toBe(SO);
    expect(broken.diagnostics?.hasProblems).toBe(true);
    expect(broken.diagnostics?.counts.UNMATCHED_SI).toBe(1);
    expect(bytesFromCells(withoutSo)).toEqual(Uint8Array.from(Array.from(bytes).filter((_, index) => index !== soOffset)));

    const repaired = makeSnapshot({
      uri: 'inline',
      fileName: 'inline.cpy',
      fileEncoding: 'ibm937',
      cells: insertByte(withoutSo, soOffset, SO),
      dirty: true,
    });

    expect(repaired.diagnostics?.hasProblems).toBe(false);
    expect(repaired.diagnostics?.counts.DBCS).toBe(2);
    expect(repaired.diagnostics?.counts.DBCS_AMBIGUOUS).toBe(0);
    expect(repaired.preview.map(entry => entry.text)).toEqual(['>', '測', '試', '<']);
  });

  it('annotates inferred DBCS bytes after a backed-up missing SO', () => {
    const bytes = encodeToIbm937('測試一下中文');
    const withoutSo = cellsFromBytes(bytes.slice(1));
    const snapshot = makeSnapshot({
      uri: 'inline',
      fileName: 'inline.cpy',
      fileEncoding: 'ibm937',
      cells: withoutSo,
      dirty: true,
    });

    expect(snapshot.diagnostics?.counts.MISSING_SO).toBe(1);
    expect(snapshot.diagnostics?.counts.DBCS).toBe(5);
    expect(snapshot.cells.slice(0, 2).map(cell => cell.diagnostic)).toEqual(['MISSING_SO', 'MISSING_SO']);
    expect(snapshot.cells.slice(2, 12).map(cell => cell.diagnostic)).toEqual(Array(10).fill('DBCS'));
  });

  it('updates SO/SI diagnostics when SI is deleted and reinserted', () => {
    const bytes = encodeToIbm937('測試');
    const cells = cellsFromBytes(bytes);
    const siOffset = bytes.indexOf(SI);
    const withoutSi = deleteByte(cells, siOffset);
    const broken = makeSnapshot({
      uri: 'inline',
      fileName: 'inline.cpy',
      fileEncoding: 'ibm937',
      cells: withoutSi,
      dirty: true,
    });

    expect(bytes[siOffset]).toBe(SI);
    expect(broken.diagnostics?.hasProblems).toBe(true);
    expect(broken.diagnostics?.counts.MISSING_SI_AT_EOF).toBe(1);

    const repaired = makeSnapshot({
      uri: 'inline',
      fileName: 'inline.cpy',
      fileEncoding: 'ibm937',
      cells: insertByte(withoutSi, siOffset, SI),
      dirty: true,
    });

    expect(repaired.diagnostics?.hasProblems).toBe(false);
    expect(repaired.diagnostics?.counts.DBCS).toBe(2);
    expect(repaired.diagnostics?.counts.DBCS_AMBIGUOUS).toBe(0);
    expect(bytesFromCells(repaired.cells)).toEqual(bytes);
  });

  it('flags DBCS corruption when a byte is inserted inside a pair', () => {
    const bytes = encodeToIbm937('測試');
    const cells = cellsFromBytes(bytes);
    const insertedInsideFirstPair = insertByte(cells, 2, 0x00);
    const snapshot = makeSnapshot({
      uri: 'inline',
      fileName: 'inline.cpy',
      fileEncoding: 'ibm937',
      cells: insertedInsideFirstPair,
      dirty: true,
    });

    expect(bytes[0]).toBe(SO);
    expect(snapshot.diagnostics?.hasProblems).toBe(true);
    expect(snapshot.diagnostics?.counts.MISSING_SI).toBeGreaterThan(0);
    expect(snapshot.diagnostics?.counts.UNMATCHED_SI).toBe(1);
    expect(snapshot.preview.some(entry => entry.kind === 'dbcs' && entry.text === '?')).toBe(true);
  });
});
