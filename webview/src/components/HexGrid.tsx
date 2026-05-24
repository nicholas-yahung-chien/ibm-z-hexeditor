import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ByteCell, EditorSnapshot, HexNibble, PreviewEntry } from '../../../src/protocol';
import { PROBLEM_KINDS, WARNING_KINDS } from '../../../src/inspector/inspectIbmDbcs';
import { vscode } from '../vscode';

const MIN_BYTES_PER_ROW = 8;
const FALLBACK_BYTES_PER_ROW = 16;
const MAX_RULER_COLUMNS = 100;

interface Props {
  snapshot: EditorSnapshot;
  jumpTarget: JumpTarget | null;
  condenseMode: boolean;
  showRuler: boolean;
}

interface JumpTarget {
  offset: number;
  length: number;
  token: number;
}

interface Cursor {
  offset: number;
  nibble: HexNibble;
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

export function HexGrid({ snapshot, jumpTarget, condenseMode, showRuler }: Props) {
  const [cursor, setCursor] = useState<Cursor>({ offset: 0, nibble: 'high' });
  const [bytesPerRow, setBytesPerRow] = useState(FALLBACK_BYTES_PER_ROW);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cursor.offset >= snapshot.cells.length) {
      setCursor({ offset: Math.max(0, snapshot.cells.length - 1), nibble: 'high' });
    }
  }, [cursor.offset, snapshot.cells.length]);

  useEffect(() => {
    if (jumpTarget === null || snapshot.cells.length === 0) {
      return;
    }

    const offset = Math.max(0, Math.min(jumpTarget.offset, snapshot.cells.length - 1));
    setCursor({ offset, nibble: 'high' });
    requestAnimationFrame(() => {
      const grid = gridRef.current;
      const target = grid?.querySelector<HTMLElement>(`[data-byte-offset="${offset}"]`);
      const row = target?.closest<HTMLElement>('.hex-row');
      if (!grid || !target || !row) {
        return;
      }

      const gridRect = grid.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const top = rowRect.top - gridRect.top + grid.scrollTop;
      const left = targetRect.left - gridRect.left + grid.scrollLeft - ((grid.clientWidth - targetRect.width) / 2);

      grid.scrollTo({
        top: Math.max(0, top),
        left: Math.max(0, left),
        behavior: 'smooth',
      });
      grid.focus({ preventScroll: true });
    });
  }, [jumpTarget, snapshot.cells.length]);

  useEffect(() => {
    const element = gridRef.current;
    if (!element) {
      return;
    }

    const measure = () => {
      const styles = window.getComputedStyle(element);
      const fontSize = Number.parseFloat(styles.fontSize) || 14;
      const row = element.querySelector<HTMLElement>('.hex-row');
      const offset = element.querySelector<HTMLElement>('.offset');
      const nibble = element.querySelector<HTMLElement>('.nibble');
      const byteGrid = element.querySelector<HTMLElement>('.byte-grid');
      const rowStyles = row ? window.getComputedStyle(row) : null;
      const byteGridStyles = byteGrid ? window.getComputedStyle(byteGrid) : null;

      const cellSize = nibble?.getBoundingClientRect().width || (fontSize * 1.45);
      const offsetWidth = condenseMode ? 0 : offset?.getBoundingClientRect().width || (fontSize * 6);
      const rowGap = condenseMode ? 0 : rowStyles ? Number.parseFloat(rowStyles.columnGap) || 0 : fontSize;
      const cellGap = byteGridStyles ? Number.parseFloat(byteGridStyles.columnGap) || 0 : fontSize * 0.18;
      const sidePadding = Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight);
      const available = element.clientWidth - sidePadding - offsetWidth - rowGap;
      const next = Math.max(
        MIN_BYTES_PER_ROW,
        Math.floor((available + cellGap) / (cellSize + cellGap)),
      );
      setBytesPerRow(Number.isFinite(next) ? next : FALLBACK_BYTES_PER_ROW);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [condenseMode]);

  const groups = useMemo(() => {
    return snapshot.lines.map(line => {
      const cells = snapshot.cells.slice(line.startOffset, line.startOffset + line.length);
      const preview = snapshot.preview.filter(entry => {
        const entryEnd = entry.byteOffset + entry.byteLength;
        const lineEnd = line.startOffset + line.length;
        return entry.byteOffset < lineEnd && entryEnd > line.startOffset;
      });
      return { line, cells, preview };
    });
  }, [snapshot]);
  const rulerColumnCount = useMemo(() => {
    const longestLine = snapshot.lines.reduce((max, line) => Math.max(max, line.length), 0);
    return Math.min(MAX_RULER_COLUMNS, longestLine);
  }, [snapshot.lines]);
  const selectedStart = jumpTarget && snapshot.cells.length > 0
    ? Math.max(0, Math.min(jumpTarget.offset, snapshot.cells.length - 1))
    : null;
  const selectedLength = jumpTarget ? Math.max(1, jumpTarget.length) : 0;

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
        return { offset: Math.max(0, current.offset - bytesPerRow), nibble: current.nibble };
      }
      return { offset: Math.min(snapshot.cells.length - 1, current.offset + bytesPerRow), nibble: current.nibble };
    });
  }, [bytesPerRow, snapshot.cells.length]);

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

  const insertAfterCursor = useCallback(() => {
    const insertAt = snapshot.cells.length === 0 ? 0 : cursor.offset + 1;
    vscode.postMessage({ type: 'insertByte', offset: insertAt, value: 0x00 });
    setCursor({ offset: insertAt, nibble: 'high' });
  }, [cursor.offset, snapshot.cells.length]);

  const deleteAtCursor = useCallback(() => {
    if (snapshot.cells.length === 0) {
      return;
    }

    vscode.postMessage({ type: 'deleteByte', offset: cursor.offset });
    setCursor({
      offset: Math.max(0, Math.min(cursor.offset, snapshot.cells.length - 2)),
      nibble: 'high',
    });
  }, [cursor.offset, snapshot.cells.length]);

  const backspaceBeforeCursor = useCallback(() => {
    if (snapshot.cells.length === 0) {
      return;
    }

    const deleteAt = Math.max(0, cursor.offset - 1);
    vscode.postMessage({ type: 'deleteByte', offset: deleteAt });
    setCursor({
      offset: Math.max(0, deleteAt),
      nibble: 'high',
    });
  }, [cursor.offset, snapshot.cells.length]);

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
    if (event.key === 'Insert') { event.preventDefault(); insertAfterCursor(); return; }
    if (event.key === 'Delete') { event.preventDefault(); deleteAtCursor(); return; }
    if (event.key === 'Backspace') { event.preventDefault(); backspaceBeforeCursor(); return; }

    if (/^[0-9a-fA-F]$/.test(event.key)) {
      event.preventDefault();
      editNibble(event.key);
    }
  }, [backspaceBeforeCursor, deleteAtCursor, editNibble, insertAfterCursor, move]);

  return (
    <main
      className="hex-grid-shell"
      tabIndex={0}
      ref={gridRef}
      onKeyDown={onKeyDown}
      aria-label={`${snapshot.fileEncoding} hex editor grid`}
    >
      {showRuler && rulerColumnCount > 0 ? (
        <ColumnRuler columnCount={rulerColumnCount} bytesPerRow={bytesPerRow} />
      ) : null}
      {groups.map(group => {
        const rows = [];
        for (let rowOffset = 0; rowOffset < group.cells.length || rowOffset === 0; rowOffset += bytesPerRow) {
          rows.push({
            rowOffset,
            cells: group.cells.slice(rowOffset, rowOffset + bytesPerRow),
            preview: group.preview.filter(entry => {
              const rowStart = group.line.startOffset + rowOffset;
              const rowEnd = rowStart + bytesPerRow;
              const entryEnd = entry.byteOffset + entry.byteLength;
              return entry.byteOffset < rowEnd && entryEnd > rowStart;
            }),
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
                  {row.preview.map(entry => {
                    const rowStart = group.line.startOffset + row.rowOffset;
                    const rowEnd = rowStart + row.cells.length;
                    const entryEnd = entry.byteOffset + entry.byteLength;
                    const colStart = Math.max(entry.byteOffset, rowStart) - rowStart;
                    const span = Math.max(1, Math.min(entryEnd, rowEnd) - Math.max(entry.byteOffset, rowStart));
                    const activePreview = cursor.offset >= entry.byteOffset && cursor.offset < entryEnd;
                    const selectedPreview = selectedStart !== null
                      ? rangesOverlap(entry.byteOffset, entry.byteLength, selectedStart, selectedLength)
                      : false;
                    return (
                      <span
                        className={[
                          'preview',
                          `preview-${entry.kind}`,
                          activePreview ? 'preview-active' : '',
                          selectedPreview ? 'preview-diagnostic-selected' : '',
                        ].filter(Boolean).join(' ')}
                        key={`p-${entry.byteOffset}`}
                        style={{ gridColumn: `${colStart + 1} / span ${span}` }}
                      >
                        {entry.text}
                      </span>
                    );
                  })}

                  {row.cells.map((cell, index) => {
                    const absoluteOffset = group.line.startOffset + row.rowOffset + index;
                    const active = cursor.offset === absoluteOffset;
                    const selected = selectedStart !== null
                      ? offsetInRange(absoluteOffset, selectedStart, selectedLength)
                      : false;
                    return (
                      <button
                        type="button"
                        className={[
                          'nibble',
                          'nibble-high',
                          active && cursor.nibble === 'high' ? 'nibble-caret' : '',
                          selected ? 'nibble-diagnostic-selected' : '',
                          cellClass(cell),
                        ].filter(Boolean).join(' ')}
                        style={{ gridColumn: index + 1 }}
                        data-byte-offset={absoluteOffset}
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
                    const selected = selectedStart !== null
                      ? offsetInRange(absoluteOffset, selectedStart, selectedLength)
                      : false;
                    return (
                      <button
                        type="button"
                        className={[
                          'nibble',
                          'nibble-low',
                          active && cursor.nibble === 'low' ? 'nibble-caret' : '',
                          selected ? 'nibble-diagnostic-selected' : '',
                          cellClass(cell),
                        ].filter(Boolean).join(' ')}
                        style={{ gridColumn: index + 1 }}
                        data-byte-offset={absoluteOffset}
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

function ColumnRuler({ columnCount, bytesPerRow }: { columnCount: number; bytesPerRow: number }) {
  const chunkSize = Math.max(MIN_BYTES_PER_ROW, bytesPerRow);
  const rows = [];
  for (let start = 0; start < columnCount; start += chunkSize) {
    const length = Math.min(chunkSize, columnCount - start);
    rows.push({
      start,
      marks: Array.from({ length }, (_, index) => rulerMark(start + index + 1)),
    });
  }

  return (
    <div className="ruler-group" aria-label={`Column ruler, 1 to ${columnCount}`}>
      {rows.map(row => (
        <div className="ruler-row" key={`ruler-${row.start}`}>
          <span className="offset ruler-offset" aria-hidden="true" />
          <div
            className="byte-grid ruler-grid"
            style={{ gridTemplateColumns: `repeat(${row.marks.length}, var(--cell-size))` }}
          >
            {row.marks.map((mark, index) => (
              <span className="ruler-mark" key={`r-${row.start + index + 1}`} style={{ gridColumn: index + 1 }}>
                {mark}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function rulerMark(column: number): string {
  if (column % 10 === 0) {
    return String(Math.floor(column / 10) % 10);
  }
  if (column % 5 === 0) {
    return '+';
  }
  return '-';
}

function offsetInRange(offset: number, start: number, length: number): boolean {
  return offset >= start && offset < start + length;
}

function rangesOverlap(startA: number, lengthA: number, startB: number, lengthB: number): boolean {
  return startA < startB + lengthB && startB < startA + lengthA;
}
