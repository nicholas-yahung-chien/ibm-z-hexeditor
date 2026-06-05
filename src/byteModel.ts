import { getIbmDbcsProfile, getIbmSbcsProfile } from './codePages';
import { decodeIbmDbcsPair, decodeIbmDbcsSbcsByte, type IbmDbcsCodePageProfile } from './codec/ibmDbcs';
import { decodeIbmSbcsByte, type IbmSbcsCodePageProfile } from './codec/ibmSbcs';
import { inspectIbmDbcs } from './inspector/inspectIbmDbcs';
import type { AnalysisResult, InspectIbmDbcsOptions } from './inspector/inspectIbmDbcs';
import { fixedRecordLength } from './recordMetadata';
import type { ByteCell, ByteSourceKind, EditorSnapshot, PreviewEntry, RecordLine, RecordMetadata } from './protocol';

export function cellsFromBytes(bytes: Uint8Array): ByteCell[] {
  return Array.from(bytes, value => ({ value }));
}

export function bytesFromCells(cells: readonly ByteCell[]): Uint8Array {
  return Uint8Array.from(cells.map(cell => cell.value));
}

export function buildLines(bytes: Uint8Array, encoding: string, recordMetadata?: RecordMetadata): RecordLine[] {
  if (bytes.length === 0) {
    return [{ lineIndex: 0, startOffset: 0, length: 0 }];
  }

  const fixedLength = fixedRecordLength(recordMetadata);
  if (fixedLength !== undefined) {
    return buildFixedRecordLines(bytes, fixedLength);
  }

  const newlineBytes = newlineSetForEncoding(encoding);
  const lines: RecordLine[] = [];
  let startOffset = 0;

  for (let i = 0; i < bytes.length; i++) {
    if (newlineBytes.has(bytes[i])) {
      lines.push({
        lineIndex: lines.length,
        startOffset,
        length: i - startOffset + 1,
      });
      startOffset = i + 1;
    }
  }

  if (startOffset < bytes.length) {
    lines.push({
      lineIndex: lines.length,
      startOffset,
      length: bytes.length - startOffset,
    });
  }

  return lines;
}

function buildFixedRecordLines(bytes: Uint8Array, recordLength: number): RecordLine[] {
  const lines: RecordLine[] = [];
  for (let startOffset = 0; startOffset < bytes.length; startOffset += recordLength) {
    lines.push({
      lineIndex: lines.length,
      startOffset,
      length: Math.min(recordLength, bytes.length - startOffset),
    });
  }
  return lines;
}

export function replaceNibble(
  cells: readonly ByteCell[],
  offset: number,
  nibble: 'high' | 'low',
  digit: number,
): ByteCell[] {
  if (offset < 0 || offset >= cells.length || !Number.isInteger(digit) || digit < 0 || digit > 0x0f) {
    return [...cells];
  }

  return cells.map((cell, index) => {
    if (index !== offset) {
      return cell;
    }

    const value = nibble === 'high'
      ? ((digit << 4) | (cell.value & 0x0f))
      : ((cell.value & 0xf0) | digit);

    return { ...cell, value };
  });
}

export function insertByte(cells: readonly ByteCell[], offset: number, value?: number): ByteCell[];
export function insertByte(
  cells: readonly ByteCell[],
  offset: number,
  value: number | undefined,
  recordMetadata: RecordMetadata | undefined,
  fileEncoding: string | undefined,
): ByteCell[];
export function insertByte(
  cells: readonly ByteCell[],
  offset: number,
  value = 0x00,
  recordMetadata?: RecordMetadata,
  fileEncoding?: string,
): ByteCell[] {
  const byte = Math.max(0, Math.min(value, 0xff));
  const fixedLength = fixedRecordLength(recordMetadata);
  if (fixedLength !== undefined) {
    return insertByteWithinFixedRecord(cells, offset, byte, fixedLength, fileEncoding);
  }

  const insertAt = Math.max(0, Math.min(offset, cells.length));
  return [
    ...cells.slice(0, insertAt),
    { value: byte },
    ...cells.slice(insertAt),
  ];
}

export function deleteByte(cells: readonly ByteCell[], offset: number): ByteCell[];
export function deleteByte(
  cells: readonly ByteCell[],
  offset: number,
  recordMetadata: RecordMetadata | undefined,
  fileEncoding: string | undefined,
): ByteCell[];
export function deleteByte(
  cells: readonly ByteCell[],
  offset: number,
  recordMetadata?: RecordMetadata,
  fileEncoding?: string,
): ByteCell[] {
  const fixedLength = fixedRecordLength(recordMetadata);
  if (fixedLength !== undefined) {
    return deleteByteWithinFixedRecord(cells, offset, fixedLength, fileEncoding);
  }

  if (offset < 0 || offset >= cells.length) {
    return [...cells];
  }

  return [
    ...cells.slice(0, offset),
    ...cells.slice(offset + 1),
  ];
}

function insertByteWithinFixedRecord(
  cells: readonly ByteCell[],
  offset: number,
  value: number,
  recordLength: number,
  fileEncoding: string | undefined,
): ByteCell[] {
  if (cells.length === 0) {
    return [{ value }];
  }

  const effectiveOffset = fixedRecordEffectiveOffset(cells, offset, recordLength);
  if (effectiveOffset === undefined) {
    return [...cells];
  }

  const { recordStart, recordEnd } = fixedRecordBounds(effectiveOffset, recordLength, cells.length);
  const insertAt = Math.max(recordStart, Math.min(offset, recordEnd - 1));
  const recordCells = [
    ...cells.slice(recordStart, insertAt),
    { value },
    ...cells.slice(insertAt, recordEnd),
  ].slice(0, recordEnd - recordStart);

  return [
    ...cells.slice(0, recordStart),
    ...recordCells,
    ...cells.slice(recordEnd),
  ];
}

function deleteByteWithinFixedRecord(
  cells: readonly ByteCell[],
  offset: number,
  recordLength: number,
  fileEncoding: string | undefined,
): ByteCell[] {
  if (offset < 0 || offset >= cells.length) {
    return [...cells];
  }

  const { recordStart, recordEnd } = fixedRecordBounds(offset, recordLength, cells.length);
  return [
    ...cells.slice(0, recordStart),
    ...cells.slice(recordStart, offset),
    ...cells.slice(offset + 1, recordEnd),
    { value: paddingByteForEncoding(fileEncoding) },
    ...cells.slice(recordEnd),
  ];
}

function fixedRecordEffectiveOffset(cells: readonly ByteCell[], offset: number, recordLength: number): number | undefined {
  if (offset < 0 || !Number.isFinite(offset)) {
    return undefined;
  }

  if (offset >= cells.length) {
    return cells.length - 1;
  }

  if (offset > 0 && offset % recordLength === 0) {
    return offset - 1;
  }

  return offset;
}

function fixedRecordBounds(offset: number, recordLength: number, totalLength: number): { recordStart: number; recordEnd: number } {
  const recordStart = Math.floor(offset / recordLength) * recordLength;
  return {
    recordStart,
    recordEnd: Math.min(recordStart + recordLength, totalLength),
  };
}

function paddingByteForEncoding(fileEncoding: string | undefined): number {
  if (fileEncoding) {
    const dbcsProfile = getIbmDbcsProfile(fileEncoding);
    if (dbcsProfile?.unicodeToSbcs[0x20] !== undefined) {
      return dbcsProfile.unicodeToSbcs[0x20];
    }

    const sbcsProfile = getIbmSbcsProfile(fileEncoding);
    if (sbcsProfile?.unicodeToSbcs[0x20] !== undefined) {
      return sbcsProfile.unicodeToSbcs[0x20];
    }
  }

  return 0x20;
}

export function makeSnapshot(args: {
  uri: string;
  fileName: string;
  fileEncoding: string;
  byteSource?: ByteSourceKind;
  cells: ByteCell[];
  dirty: boolean;
  diagnosticsOptions?: InspectIbmDbcsOptions;
  recordMetadata?: RecordMetadata;
}): EditorSnapshot {
  const bytes = bytesFromCells(args.cells);
  const lines = buildLines(bytes, args.fileEncoding, args.recordMetadata);
  const profile = getIbmDbcsProfile(args.fileEncoding);
  const diagnostics = profile ? inspectIbmDbcs(profile, bytes, args.diagnosticsOptions) : null;
  const preview = previewBytes(bytes, args.fileEncoding);
  const annotated = annotateCells(args.cells, diagnostics);

  return {
    uri: args.uri,
    fileName: args.fileName,
    fileEncoding: args.fileEncoding,
    byteSource: args.byteSource ?? 'local-raw',
    recordMetadata: args.recordMetadata,
    cells: annotated,
    lines,
    preview,
    diagnostics,
    dirty: args.dirty,
  };
}

export function previewBytes(bytes: Uint8Array, encoding: string): PreviewEntry[] {
  const profile = getIbmDbcsProfile(encoding);
  if (profile) {
    return previewIbmDbcs(profile, bytes);
  }
  const sbcsProfile = getIbmSbcsProfile(encoding);
  if (sbcsProfile) {
    return previewIbmSbcs(sbcsProfile, bytes);
  }
  if (encoding === 'utf8' || encoding === 'utf8bom') {
    return previewUtf8(bytes);
  }

  return Array.from(bytes, (value, byteOffset) => ({
    byteOffset,
    byteLength: 1,
    text: printableAscii(value),
    kind: value < 0x20 || value === 0x7f ? 'control' : 'sbcs',
  }));
}

function previewUtf8(bytes: Uint8Array): PreviewEntry[] {
  const entries: PreviewEntry[] = [];
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let i = 0;

  while (i < bytes.length) {
    const width = utf8SequenceWidth(bytes[i]);
    if (width === 0 || i + width > bytes.length || !hasUtf8Continuation(bytes, i, width)) {
      entries.push({ byteOffset: i, byteLength: 1, text: '?', kind: 'invalid' });
      i++;
      continue;
    }

    try {
      const text = decoder.decode(bytes.slice(i, i + width));
      entries.push({
        byteOffset: i,
        byteLength: width,
        text: text === '\n' || text === '\r' || text === '\t' ? '.' : text,
        kind: (text.codePointAt(0) ?? 0) < 0x20 ? 'control' : 'sbcs',
      });
      i += width;
    } catch {
      entries.push({ byteOffset: i, byteLength: 1, text: '?', kind: 'invalid' });
      i++;
    }
  }

  return entries;
}

function previewIbmSbcs(profile: IbmSbcsCodePageProfile, bytes: Uint8Array): PreviewEntry[] {
  return Array.from(bytes, (value, byteOffset) => {
    const text = decodeIbmSbcsByte(profile, value);
    return {
      byteOffset,
      byteLength: 1,
      text: text.startsWith('[') ? '.' : text,
      kind: text.startsWith('[') ? 'control' : 'sbcs',
    };
  });
}

function previewIbmDbcs(profile: IbmDbcsCodePageProfile, bytes: Uint8Array): PreviewEntry[] {
  const entries: PreviewEntry[] = [];
  let inDbcs = false;
  let i = 0;

  while (i < bytes.length) {
    const byte = bytes[i];
    if (byte === profile.so) {
      entries.push({ byteOffset: i, byteLength: 1, text: '>', kind: 'so' });
      inDbcs = true;
      i++;
      continue;
    }

    if (byte === profile.si) {
      entries.push({ byteOffset: i, byteLength: 1, text: '<', kind: 'si' });
      inDbcs = false;
      i++;
      continue;
    }

    if (inDbcs) {
      if (i + 1 < bytes.length) {
        entries.push({
          byteOffset: i,
          byteLength: 2,
          text: decodeIbmDbcsPair(profile, byte, bytes[i + 1]) ?? '?',
          kind: 'dbcs',
        });
        i += 2;
      } else {
        entries.push({ byteOffset: i, byteLength: 1, text: '?', kind: 'invalid' });
        i++;
      }
      continue;
    }

    const text = decodeIbmDbcsSbcsByte(profile, byte);
    entries.push({
      byteOffset: i,
      byteLength: 1,
      text: text.startsWith('[') ? '.' : text,
      kind: text.startsWith('[') ? 'control' : 'sbcs',
    });
    i++;
  }

  return entries;
}

function utf8SequenceWidth(first: number): number {
  if (first <= 0x7f) return 1;
  if (first >= 0xc2 && first <= 0xdf) return 2;
  if (first >= 0xe0 && first <= 0xef) return 3;
  if (first >= 0xf0 && first <= 0xf4) return 4;
  return 0;
}

function hasUtf8Continuation(bytes: Uint8Array, offset: number, width: number): boolean {
  for (let i = 1; i < width; i++) {
    const byte = bytes[offset + i];
    if (byte < 0x80 || byte > 0xbf) {
      return false;
    }
  }
  return true;
}

function annotateCells(cells: readonly ByteCell[], diagnostics: AnalysisResult | null): ByteCell[] {
  const annotated: ByteCell[] = cells.map(cell => ({ ...cell, diagnostic: undefined }));
  if (!diagnostics) {
    return annotated;
  }

  for (const event of diagnostics.events) {
    for (let i = 0; i < event.length; i++) {
      const offset = event.offset + i;
      if (offset < annotated.length) {
        annotated[offset] = { ...annotated[offset], diagnostic: event.kind };
      }
    }
  }

  return annotated;
}

function newlineSetForEncoding(encoding: string): Set<number> {
  const profile = getIbmDbcsProfile(encoding);
  if (profile) {
    return new Set(profile.newlineBytes);
  }
  const sbcsProfile = getIbmSbcsProfile(encoding);
  if (sbcsProfile) {
    return new Set(sbcsProfile.newlineBytes);
  }
  return new Set([0x0a]);
}

function printableAscii(value: number): string {
  if (value < 0x20 || value === 0x7f) {
    return '.';
  }
  return String.fromCharCode(value);
}
