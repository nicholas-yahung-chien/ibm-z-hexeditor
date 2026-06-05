import { describe, expect, it } from 'vitest';
import type { EditorSnapshot } from '../src/protocol';
import { searchHex, searchUnicode } from '../webview/src/search';

describe('webview search', () => {
  it('matches separated hex bytes with mixed 0x prefixes', () => {
    const snapshot = snapshotFromBytes([0x00, 0xa6, 0x4f, 0xa6, 0x4f], 0x100);

    expect(searchHex(snapshot, '0xa6 4F').results).toEqual([
      { offset: 0x101, length: 2 },
      { offset: 0x103, length: 2 },
    ]);
  });

  it('rejects unseparated multi-byte hex input', () => {
    const snapshot = snapshotFromBytes([0xa6, 0x4f]);

    expect(searchHex(snapshot, 'a64f').error).toBe('invalidHex');
    expect(searchHex(snapshot, '0xa4f').error).toBe('invalidHex');
  });

  it('matches unicode text and maps results back to byte spans', () => {
    const snapshot = snapshotFromPreview([
      { byteOffset: 10, byteLength: 1, text: 'A', kind: 'sbcs' },
      { byteOffset: 11, byteLength: 2, text: '測', kind: 'dbcs' },
      { byteOffset: 13, byteLength: 2, text: '試', kind: 'dbcs' },
    ]);

    expect(searchUnicode(snapshot, '測試').results).toEqual([
      { offset: 11, length: 4 },
    ]);
  });

  it('supports unicode wildcards and escapes', () => {
    const snapshot = snapshotFromPreview([
      { byteOffset: 0, byteLength: 1, text: 'A', kind: 'sbcs' },
      { byteOffset: 1, byteLength: 1, text: '.', kind: 'sbcs' },
      { byteOffset: 2, byteLength: 1, text: '*', kind: 'sbcs' },
      { byteOffset: 3, byteLength: 1, text: 'Z', kind: 'sbcs' },
    ]);

    expect(searchUnicode(snapshot, 'A.*Z').results).toEqual([{ offset: 0, length: 4 }]);
    expect(searchUnicode(snapshot, '\\.\\*').results).toEqual([{ offset: 1, length: 2 }]);
  });

  it('keeps unicode wildcards inside a single editor line', () => {
    const snapshot = snapshotFromPreview([
      { byteOffset: 0, byteLength: 1, text: 'A', kind: 'sbcs' },
      { byteOffset: 1, byteLength: 1, text: 'B', kind: 'sbcs' },
      { byteOffset: 2, byteLength: 1, text: 'C', kind: 'sbcs' },
      { byteOffset: 3, byteLength: 1, text: 'Z', kind: 'sbcs' },
    ], [
      { lineIndex: 0, startOffset: 0, length: 2 },
      { lineIndex: 1, startOffset: 2, length: 2 },
    ]);

    expect(searchUnicode(snapshot, 'A*Z').results).toEqual([]);
  });

  it('matches a single unicode wildcard per editor line instead of the whole snapshot', () => {
    const snapshot = snapshotFromPreview([
      { byteOffset: 0, byteLength: 1, text: 'A', kind: 'sbcs' },
      { byteOffset: 1, byteLength: 1, text: 'B', kind: 'sbcs' },
      { byteOffset: 2, byteLength: 1, text: 'C', kind: 'sbcs' },
      { byteOffset: 3, byteLength: 1, text: 'D', kind: 'sbcs' },
    ], [
      { lineIndex: 0, startOffset: 0, length: 2 },
      { lineIndex: 1, startOffset: 2, length: 2 },
    ]);

    expect(searchUnicode(snapshot, '*').results).toEqual([
      { offset: 0, length: 2 },
      { offset: 2, length: 2 },
    ]);
  });

  it('uses the nearest same-line match after a unicode wildcard', () => {
    const snapshot = snapshotFromPreview([
      { byteOffset: 0, byteLength: 1, text: 'A', kind: 'sbcs' },
      { byteOffset: 1, byteLength: 1, text: 'X', kind: 'sbcs' },
      { byteOffset: 2, byteLength: 1, text: 'Z', kind: 'sbcs' },
      { byteOffset: 3, byteLength: 1, text: 'Z', kind: 'sbcs' },
    ]);

    expect(searchUnicode(snapshot, 'A*Z').results).toEqual([{ offset: 0, length: 3 }]);
  });

  it('extends a trailing unicode wildcard to the end of the editor line', () => {
    const snapshot = snapshotFromPreview([
      { byteOffset: 0, byteLength: 1, text: 'A', kind: 'sbcs' },
      { byteOffset: 1, byteLength: 2, text: '測', kind: 'dbcs' },
      { byteOffset: 3, byteLength: 2, text: '文', kind: 'dbcs' },
      { byteOffset: 5, byteLength: 1, text: 'Z', kind: 'sbcs' },
    ]);

    expect(searchUnicode(snapshot, '測*').results).toEqual([{ offset: 1, length: 5 }]);
  });

  it('does not extend escaped trailing unicode wildcard text', () => {
    const snapshot = snapshotFromPreview([
      { byteOffset: 0, byteLength: 1, text: '測', kind: 'sbcs' },
      { byteOffset: 1, byteLength: 1, text: '*', kind: 'sbcs' },
      { byteOffset: 2, byteLength: 1, text: 'Z', kind: 'sbcs' },
    ]);

    expect(searchUnicode(snapshot, '測\\*').results).toEqual([{ offset: 0, length: 2 }]);
  });
});

function snapshotFromBytes(bytes: number[], pageStartOffset = 0): EditorSnapshot {
  return {
    uri: 'test:',
    fileName: 'test',
    fileEncoding: 'ibm937',
    byteSource: 'local-raw',
    cells: bytes.map(value => ({ value })),
    lines: [{ lineIndex: 0, startOffset: pageStartOffset, length: bytes.length }],
    preview: bytes.map((value, index) => ({
      byteOffset: pageStartOffset + index,
      byteLength: 1,
      text: String.fromCharCode(value),
      kind: 'sbcs',
    })),
    diagnostics: null,
    dirty: false,
    page: {
      mode: 'paged',
      pageIndex: 0,
      pageCount: 1,
      pageStartOffset,
      pageEndOffset: pageStartOffset + bytes.length,
      totalBytes: bytes.length,
      totalLines: 1,
      pageLineStart: 0,
      pageLineCount: 1,
    },
  };
}

function snapshotFromPreview(
  preview: EditorSnapshot['preview'],
  lines?: EditorSnapshot['lines'],
): EditorSnapshot {
  const maxOffset = Math.max(...preview.map(entry => entry.byteOffset + entry.byteLength), 0);
  return {
    uri: 'test:',
    fileName: 'test',
    fileEncoding: 'ibm937',
    byteSource: 'local-raw',
    cells: Array.from({ length: maxOffset }, () => ({ value: 0x00 })),
    lines: lines ?? [{ lineIndex: 0, startOffset: 0, length: maxOffset }],
    preview,
    diagnostics: null,
    dirty: false,
  };
}
