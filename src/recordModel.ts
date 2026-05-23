import { encodeToIbm937, decodeFromIbm937 } from './codec/ibm937';
import { inspectIbm937 } from './inspector/inspect937';
import type { ByteCell, EditorSnapshot, RecordLine } from './protocol';

interface SplitLine {
  text: string;
  eol: string;
}

function splitPreservingEol(text: string): SplitLine[] {
  const result: SplitLine[] = [];
  const pattern = /(.*?)(\r\n|\n|\r|$)/gs;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const [, lineText, eol] = match;
    if (lineText === '' && eol === '' && match.index === text.length) {
      break;
    }
    result.push({ text: lineText, eol });
    if (eol === '') {
      break;
    }
  }

  return result.length > 0 ? result : [{ text: '', eol: '' }];
}

export function buildRecordsFromText(text: string): { cells: ByteCell[]; lines: RecordLine[] } {
  const cells: ByteCell[] = [];
  const lines: RecordLine[] = [];

  splitPreservingEol(text).forEach((line, lineIndex) => {
    const startOffset = cells.length;
    const encoded = encodeToIbm937(line.text);

    for (let i = 0; i < encoded.length; i++) {
      cells.push({
        value: encoded[i],
      });
    }

    lines.push({
      lineIndex,
      startOffset,
      length: encoded.length,
      eol: line.eol,
    });
  });

  return { cells, lines };
}

export function applyIbm937Diagnostics(cells: ByteCell[]): { cells: ByteCell[]; diagnostics: ReturnType<typeof inspectIbm937> | null } {
  if (cells.length === 0) {
    return { cells, diagnostics: null };
  }

  const bytes = Uint8Array.from(cells.map(cell => cell.value));
  const diagnostics = inspectIbm937(bytes);
  const annotated: ByteCell[] = cells.map(cell => ({ ...cell, diagnostic: undefined }));

  for (const event of diagnostics.events) {
    for (let i = 0; i < event.length; i++) {
      const offset = event.offset + i;
      if (offset < annotated.length) {
        annotated[offset] = { ...annotated[offset], diagnostic: event.kind };
      }
    }
  }

  return { cells: annotated, diagnostics };
}

export function decodeRecordsToText(cells: readonly ByteCell[], lines: readonly RecordLine[]): string {
  return lines.map(line => {
    const lineBytes = Uint8Array.from(
      cells.slice(line.startOffset, line.startOffset + line.length).map(cell => cell.value),
    );
    return `${decodeFromIbm937(lineBytes)}${line.eol}`;
  }).join('');
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
  sourceEncoding: string;
  cells: ByteCell[];
  lines: RecordLine[];
  dirty: boolean;
}): EditorSnapshot {
  const inspected = applyIbm937Diagnostics(args.cells);
  return {
    uri: args.uri,
    fileName: args.fileName,
    fileEncoding: args.sourceEncoding,
    cells: inspected.cells,
    lines: args.lines,
    preview: [],
    diagnostics: inspected.diagnostics,
    dirty: args.dirty,
  };
}
