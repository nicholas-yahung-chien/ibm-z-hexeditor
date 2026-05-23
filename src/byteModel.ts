import { decodeDbcsPair, decodeSbcsByte, SI, SO } from './codec/ibm937';
import { inspectIbm937 } from './inspector/inspect937';
import type { ByteCell, EditorSnapshot, PreviewEntry, RecordLine } from './protocol';

export function cellsFromBytes(bytes: Uint8Array): ByteCell[] {
  return Array.from(bytes, value => ({ value }));
}

export function bytesFromCells(cells: readonly ByteCell[]): Uint8Array {
  return Uint8Array.from(cells.map(cell => cell.value));
}

export function buildLines(bytes: Uint8Array, encoding: string): RecordLine[] {
  if (bytes.length === 0) {
    return [{ lineIndex: 0, startOffset: 0, length: 0 }];
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

export function replaceNibble(
  cells: readonly ByteCell[],
  offset: number,
  nibble: 'high' | 'low',
  digit: number,
): ByteCell[] {
  if (offset < 0 || offset >= cells.length || digit < 0 || digit > 0x0f) {
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

export function makeSnapshot(args: {
  uri: string;
  fileName: string;
  fileEncoding: string;
  cells: ByteCell[];
  dirty: boolean;
}): EditorSnapshot {
  const bytes = bytesFromCells(args.cells);
  const lines = buildLines(bytes, args.fileEncoding);
  const diagnostics = args.fileEncoding === 'ibm937' ? inspectIbm937(bytes) : null;
  const preview = previewBytes(bytes, args.fileEncoding);
  const annotated = annotateCells(args.cells, diagnostics);

  return {
    uri: args.uri,
    fileName: args.fileName,
    fileEncoding: args.fileEncoding,
    cells: annotated,
    lines,
    preview,
    diagnostics,
    dirty: args.dirty,
  };
}

export function previewBytes(bytes: Uint8Array, encoding: string): PreviewEntry[] {
  if (encoding === 'ibm937') {
    return previewIbm937(bytes);
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

function previewIbm937(bytes: Uint8Array): PreviewEntry[] {
  const entries: PreviewEntry[] = [];
  let inDbcs = false;
  let i = 0;

  while (i < bytes.length) {
    const byte = bytes[i];
    if (byte === SO) {
      entries.push({ byteOffset: i, byteLength: 1, text: '>', kind: 'so' });
      inDbcs = true;
      i++;
      continue;
    }

    if (byte === SI) {
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
          text: decodeDbcsPair(byte, bytes[i + 1]) ?? '?',
          kind: 'dbcs',
        });
        i += 2;
      } else {
        entries.push({ byteOffset: i, byteLength: 1, text: '?', kind: 'invalid' });
        i++;
      }
      continue;
    }

    const text = decodeSbcsByte(byte);
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

function annotateCells(cells: readonly ByteCell[], diagnostics: ReturnType<typeof inspectIbm937> | null): ByteCell[] {
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
  if (encoding === 'ibm937') {
    return new Set([0x15]);
  }
  return new Set([0x0a]);
}

function printableAscii(value: number): string {
  if (value < 0x20 || value === 0x7f) {
    return '.';
  }
  return String.fromCharCode(value);
}
