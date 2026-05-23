import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ByteCell, EditorSnapshot, HexNibble } from '../../../src/protocol';
import { decodeDbcsPair, decodeSbcsByte, SI, SO } from '../../../src/codec/ibm937';
import { PROBLEM_KINDS, WARNING_KINDS } from '../../../src/inspector/inspect937';
import { vscode } from '../vscode';

const BYTES_PER_ROW = 16;

interface Props {
  snapshot: EditorSnapshot;
}

interface Cursor {
  offset: number;
  nibble: HexNibble;
}

interface PreviewEntry {
  kind: 'sbcs' | 'so' | 'si' | 'dbcs-first' | 'dbcs-second' | 'invalid';
  text: string;
}

function cellClass(cell: ByteCell): string {
  if (!cell.diagnostic) {
    return '';
  }
  if (PROBLEM_KINDS.has(cell.diagnostic as never)) {
    return 'cell-problem';
  }
  if (WARNING_KINDS.has(cell.diagnostic as never)) {
    return 'cell-warning';
  }
  return '';
}

function sbcsPreview(byte: number): string {
  const text = decodeSbcsByte(byte);
  return text.startsWith('[') ? '.' : text;
}

function buildPreview(cells: readonly ByteCell[]): PreviewEntry[] {
  const entries: PreviewEntry[] = [];
  let inDbcs = false;
  let i = 0;

  while (i < cells.length) {
    const byte = cells[i].value;
    if (byte === SO) {
      entries.push({ kind: 'so', text: '>' });
      inDbcs = true;
      i++;
      continue;
    }
    if (byte === SI) {
      entries.push({ kind: 'si', text: '<' });
      inDbcs = false;
      i++;
      continue;
    }
    if (inDbcs && i + 1 < cells.length) {
      entries.push({ kind: 'dbcs-first', text: decodeDbcsPair(byte, cells[i + 1].value) ?? '?' });
      entries.push({ kind: 'dbcs-second', text: '' });
      i += 2;
      continue;
    }
    entries.push({ kind: inDbcs ? 'invalid' : 'sbcs', text: inDbcs ? '?' : sbcsPreview(byte) });
    i++;
  }

  return entries;
}

export function HexGrid({ snapshot }: Props) {
  const [cursor, setCursor] = useState<Cursor>({ offset: 0, nibble: 'high' });
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cursor.offset >= snapshot.cells.length) {
      setCursor({ offset: Math.max(0, snapshot.cells.length - 1), nibble: 'high' });
    }
  }, [cursor.offset, snapshot.cells.length]);

  const groups = useMemo(() => {
    return snapshot.lines.map(line => {
      const cells = snapshot.cells.slice(line.startOffset, line.startOffset + line.length);
      return { line, cells, preview: buildPreview(cells) };
    });
  }, [snapshot]);

  const move = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    setCursor(current => {
      if (direction === 'left') {
        if (current.nibble === 'low') return { ...current, nibble: 'high' };
        return current.offset > 0 ? { offset: current.offset - 1, nibble: 'low' } : current;
      }
      if (direction === 'right') {
        if (current.nibble === 'high') return { ...current, nibble: 'low' };
        return current.offset < snapshot.cells.length - 1 ? { offset: current.offset + 1, nibble: 'high' } : current;
      }
      if (direction === 'up') {
        return { offset: Math.max(0, current.offset - BYTES_PER_ROW), nibble: current.nibble };
      }
      return { offset: Math.min(snapshot.cells.length - 1, current.offset + BYTES_PER_ROW), nibble: current.nibble };
    });
  }, [snapshot.cells.length]);

  const editNibble = useCallback((hexDigit: string) => {
    const digit = Number.parseInt(hexDigit, 16);
    if (Number.isNaN(digit)) {
      return;
    }

    vscode.postMessage({ type: 'replaceNibble', offset: cursor.offset, nibble: cursor.nibble, digit });
    setCursor(current => {
      if (current.nibble === 'high') {
        return { ...current, nibble: 'low' };
      }
      return {
        offset: Math.min(snapshot.cells.length - 1, current.offset + 1),
        nibble: 'high',
      };
    });
  }, [cursor, snapshot.cells.length]);

  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      vscode.postMessage({ type: 'save' });
      return;
    }

    if (event.key === 'ArrowLeft') { event.preventDefault(); move('left'); return; }
    if (event.key === 'ArrowRight') { event.preventDefault(); move('right'); return; }
    if (event.key === 'ArrowUp') { event.preventDefault(); move('up'); return; }
    if (event.key === 'ArrowDown') { event.preventDefault(); move('down'); return; }

    if (/^[0-9a-fA-F]$/.test(event.key)) {
      event.preventDefault();
      editNibble(event.key);
    }
  }, [editNibble, move]);

  return (
    <main
      className="hex-grid-shell"
      tabIndex={0}
      ref={gridRef}
      onKeyDown={onKeyDown}
      aria-label="IBM-937 hex editor grid"
    >
      {groups.map(group => {
        const rows = [];
        for (let rowOffset = 0; rowOffset < group.cells.length || rowOffset === 0; rowOffset += BYTES_PER_ROW) {
          rows.push({
            rowOffset,
            cells: group.cells.slice(rowOffset, rowOffset + BYTES_PER_ROW),
            preview: group.preview.slice(rowOffset, rowOffset + BYTES_PER_ROW),
          });
          if (group.cells.length === 0) {
            break;
          }
        }

        return (
          <section className="record-group" key={group.line.lineIndex}>
            {rows.map(row => (
              <div className="hex-row" key={`${group.line.lineIndex}-${row.rowOffset}`}>
                <span className="offset">
                  {(group.line.startOffset + row.rowOffset).toString(16).toUpperCase().padStart(6, '0')}
                </span>
                <div
                  className="byte-grid"
                  style={{ gridTemplateColumns: `repeat(${Math.max(row.cells.length, 1)}, var(--cell-size))` }}
                >
                  {row.preview.map((entry, index) => {
                    if (entry.kind === 'dbcs-second') {
                      return null;
                    }
                    const span = entry.kind === 'dbcs-first' && index + 1 < row.cells.length ? 2 : 1;
                    return (
                      <span
                        className={`preview preview-${entry.kind}`}
                        key={`p-${index}`}
                        style={{ gridColumn: `${index + 1} / span ${span}` }}
                      >
                        {entry.text}
                      </span>
                    );
                  })}

                  {row.cells.map((cell, index) => {
                    const absoluteOffset = group.line.startOffset + row.rowOffset + index;
                    const active = cursor.offset === absoluteOffset;
                    return (
                      <button
                        type="button"
                        className={[
                          'nibble',
                          'nibble-high',
                          active && cursor.nibble === 'high' ? 'nibble-caret' : '',
                          cellClass(cell),
                        ].filter(Boolean).join(' ')}
                        style={{ gridColumn: index + 1 }}
                        key={`h-${absoluteOffset}`}
                        onClick={() => {
                          gridRef.current?.focus();
                          setCursor({ offset: absoluteOffset, nibble: 'high' });
                        }}
                      >
                        {((cell.value >> 4) & 0x0f).toString(16).toUpperCase()}
                      </button>
                    );
                  })}

                  {row.cells.map((cell, index) => {
                    const absoluteOffset = group.line.startOffset + row.rowOffset + index;
                    const active = cursor.offset === absoluteOffset;
                    return (
                      <button
                        type="button"
                        className={[
                          'nibble',
                          'nibble-low',
                          active && cursor.nibble === 'low' ? 'nibble-caret' : '',
                          cellClass(cell),
                        ].filter(Boolean).join(' ')}
                        style={{ gridColumn: index + 1 }}
                        key={`l-${absoluteOffset}`}
                        onClick={() => {
                          gridRef.current?.focus();
                          setCursor({ offset: absoluteOffset, nibble: 'low' });
                        }}
                      >
                        {(cell.value & 0x0f).toString(16).toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        );
      })}
    </main>
  );
}
