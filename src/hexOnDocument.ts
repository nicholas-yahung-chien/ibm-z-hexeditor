import * as vscode from 'vscode';
import { bytesFromCells, cellsFromBytes, deleteByte, insertByte, makeSnapshot, replaceNibble } from './byteModel';
import { buildDisplayLinesForPage, buildPageRanges } from './paging';
import type { ByteCell, EditorSnapshot, HexNibble, RenderMode } from './protocol';
import type { PerformanceLogFields } from './protocol';
import type { AnalysisResult, InspectIbmDbcsOptions } from './inspector/inspectIbmDbcs';
import type { HexOnSession } from './sessionRegistry';

export class HexOnDocument implements vscode.CustomDocument {
  private cells: ByteCell[];
  private savedCells: ByteCell[];
  private dirty = false;
  private pageIndex = 0;

  private readonly changeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChangeSnapshot = this.changeEmitter.event;

  constructor(
    readonly uri: vscode.Uri,
    readonly fileName: string,
    readonly fileEncoding: string,
    readonly sourceViewColumn: vscode.ViewColumn | undefined,
    bytes: Uint8Array,
    private diagnosticsOptions: InspectIbmDbcsOptions = {},
    private readonly performanceLog?: (phase: string, fields: PerformanceLogFields) => void,
  ) {
    this.cells = cellsFromBytes(bytes);
    this.savedCells = cellsFromBytes(bytes);
  }

  static async create(
    uri: vscode.Uri,
    session: HexOnSession | undefined,
    diagnosticsOptions: InspectIbmDbcsOptions = {},
    performanceLog?: (phase: string, fields: PerformanceLogFields) => void,
  ): Promise<HexOnDocument> {
    const readStart = performance.now();
    const bytes = session?.bytes ?? await vscode.workspace.fs.readFile(uri);
    performanceLog?.('document.readBytes', {
      durationMs: elapsed(readStart),
      bytes: bytes.length,
      source: session?.bytes ? 'session' : 'disk',
    });

    return new HexOnDocument(
      uri,
      uri.fsPath || uri.path,
      session?.fileEncoding ?? 'utf8',
      session?.sourceViewColumn,
      bytes,
      diagnosticsOptions,
      performanceLog,
    );
  }

  dispose(): void {
    this.changeEmitter.dispose();
  }

  snapshot(renderMode: RenderMode = 'full'): EditorSnapshot {
    const start = performance.now();
    const snapshot = renderMode === 'paged' ? this.pageSnapshot() : this.fullSnapshot();
    this.performanceLog?.('document.snapshot', {
      durationMs: elapsed(start),
      bytes: snapshot.cells.length,
      lines: snapshot.lines.length,
      previewEntries: snapshot.preview.length,
      diagnosticEvents: snapshot.diagnostics?.events.length ?? 0,
      dirty: snapshot.dirty,
      renderMode,
      pageIndex: snapshot.page?.pageIndex ?? null,
      pageCount: snapshot.page?.pageCount ?? null,
    });
    return snapshot;
  }

  setPage(pageIndex: number): void {
    const bytes = bytesFromCells(this.cells);
    const ranges = buildPageRanges(bytes, this.fileEncoding);
    this.pageIndex = clampPageIndex(pageIndex, ranges.length);
  }

  updateDiagnosticsOptions(diagnosticsOptions: InspectIbmDbcsOptions): void {
    this.diagnosticsOptions = diagnosticsOptions;
    this.changeEmitter.fire();
  }

  hasUnsavedChanges(): boolean {
    return this.dirty;
  }

  replaceNibble(offset: number, nibble: HexNibble, digit: number): { undo: () => void; redo: () => void } {
    const before = [...this.cells];
    const after = replaceNibble(this.cells, offset, nibble, digit);
    return this.applyEdit(before, after);
  }

  insertByte(offset: number, value = 0x00): { undo: () => void; redo: () => void } {
    const before = [...this.cells];
    const after = insertByte(this.cells, offset, value);
    return this.applyEdit(before, after);
  }

  deleteByte(offset: number): { undo: () => void; redo: () => void } {
    const before = [...this.cells];
    const after = deleteByte(this.cells, offset);
    return this.applyEdit(before, after);
  }

  private applyEdit(before: ByteCell[], after: ByteCell[]): { undo: () => void; redo: () => void } {
    const apply = (cells: ByteCell[]) => {
      this.cells = cells;
      this.dirty = !sameCellValues(this.cells, this.savedCells);
      this.changeEmitter.fire();
    };

    apply(after);

    return {
      undo: () => apply(before),
      redo: () => apply(after),
    };
  }

  async save(cancellation: vscode.CancellationToken): Promise<void> {
    if (cancellation.isCancellationRequested) {
      return;
    }

    const start = performance.now();
    await this.writeTo(this.uri, cancellation);
    this.savedCells = this.cells;
    this.dirty = false;
    this.changeEmitter.fire();
    this.performanceLog?.('document.save', {
      durationMs: elapsed(start),
      bytes: this.cells.length,
    });
  }

  async writeTo(uri: vscode.Uri, cancellation?: vscode.CancellationToken): Promise<void> {
    if (cancellation?.isCancellationRequested) {
      return;
    }

    const start = performance.now();
    const bytes = bytesFromCells(this.cells);
    if (cancellation?.isCancellationRequested) {
      return;
    }

    await vscode.workspace.fs.writeFile(uri, bytes);
    this.performanceLog?.('document.writeTo', {
      durationMs: elapsed(start),
      bytes: bytes.length,
      destination: uri.fsPath || uri.toString(),
    });
  }

  async revert(): Promise<void> {
    const start = performance.now();
    const bytes = await vscode.workspace.fs.readFile(this.uri);
    this.cells = cellsFromBytes(bytes);
    this.savedCells = cellsFromBytes(bytes);
    this.dirty = false;
    this.pageIndex = 0;
    this.changeEmitter.fire();
    this.performanceLog?.('document.revert', {
      durationMs: elapsed(start),
      bytes: bytes.length,
    });
  }

  private fullSnapshot(): EditorSnapshot {
    return makeSnapshot({
      uri: this.uri.toString(),
      fileName: this.fileName,
      fileEncoding: this.fileEncoding,
      cells: this.cells,
      dirty: this.dirty,
      diagnosticsOptions: this.diagnosticsOptions,
    });
  }

  private pageSnapshot(): EditorSnapshot {
    const bytes = bytesFromCells(this.cells);
    const ranges = buildPageRanges(bytes, this.fileEncoding);
    const pageIndex = clampPageIndex(this.pageIndex, ranges.length);
    this.pageIndex = pageIndex;
    const range = ranges[pageIndex];
    const pageCells = this.cells.slice(range.pageStartOffset, range.pageEndOffset);
    const snapshot = makeSnapshot({
      uri: this.uri.toString(),
      fileName: this.fileName,
      fileEncoding: this.fileEncoding,
      cells: pageCells,
      dirty: this.dirty,
      diagnosticsOptions: this.diagnosticsOptions,
    });

    const pageBytes = bytes.slice(range.pageStartOffset, range.pageEndOffset);
    return {
      ...snapshot,
      lines: buildDisplayLinesForPage(pageBytes, this.fileEncoding, range),
      preview: snapshot.preview.map(entry => ({
        ...entry,
        byteOffset: entry.byteOffset + range.pageStartOffset,
      })),
      diagnostics: shiftDiagnostics(snapshot.diagnostics, range.pageStartOffset),
      page: {
        mode: 'paged',
        pageIndex: range.pageIndex,
        pageCount: range.pageCount,
        pageStartOffset: range.pageStartOffset,
        pageEndOffset: range.pageEndOffset,
        totalBytes: range.totalBytes,
        totalLines: range.totalLines,
        pageLineStart: range.pageLineStart,
        pageLineCount: range.pageLineCount,
      },
    };
  }
}

function elapsed(start: number): number {
  return Number((performance.now() - start).toFixed(2));
}

function sameCellValues(left: readonly ByteCell[], right: readonly ByteCell[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let i = 0; i < left.length; i++) {
    if (left[i].value !== right[i].value) {
      return false;
    }
  }

  return true;
}

function clampPageIndex(pageIndex: number, pageCount: number): number {
  return Math.max(0, Math.min(Math.trunc(pageIndex), Math.max(0, pageCount - 1)));
}

function shiftDiagnostics(result: AnalysisResult | null, offsetDelta: number): AnalysisResult | null {
  if (!result || offsetDelta === 0) {
    return result;
  }

  return {
    ...result,
    events: result.events.map(event => ({
      ...event,
      offset: event.offset + offsetDelta,
      startOrdinal: event.startOrdinal + offsetDelta,
      endOrdinal: event.endOrdinal + offsetDelta,
    })),
  };
}
