import * as vscode from 'vscode';
import { bytesFromCells, cellsFromBytes, deleteByte, insertByte, makeSnapshot, replaceNibble } from './byteModel';
import type { ByteCell, EditorSnapshot, HexNibble } from './protocol';
import type { HexOnSession } from './sessionRegistry';

export class HexOnDocument implements vscode.CustomDocument {
  private cells: ByteCell[];
  private savedCells: ByteCell[];
  private dirty = false;

  private readonly changeEmitter = new vscode.EventEmitter<EditorSnapshot>();
  readonly onDidChangeSnapshot = this.changeEmitter.event;

  constructor(
    readonly uri: vscode.Uri,
    readonly fileName: string,
    readonly fileEncoding: string,
    readonly sourceViewColumn: vscode.ViewColumn | undefined,
    bytes: Uint8Array,
  ) {
    this.cells = cellsFromBytes(bytes);
    this.savedCells = cellsFromBytes(bytes);
  }

  static async create(uri: vscode.Uri, session: HexOnSession | undefined): Promise<HexOnDocument> {
    const bytes = session?.bytes ?? await vscode.workspace.fs.readFile(uri);

    return new HexOnDocument(
      uri,
      uri.fsPath || uri.path,
      session?.fileEncoding ?? 'utf8',
      session?.sourceViewColumn,
      bytes,
    );
  }

  dispose(): void {
    this.changeEmitter.dispose();
  }

  snapshot(): EditorSnapshot {
    return makeSnapshot({
      uri: this.uri.toString(),
      fileName: this.fileName,
      fileEncoding: this.fileEncoding,
      cells: this.cells,
      dirty: this.dirty,
    });
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
      this.changeEmitter.fire(this.snapshot());
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

    await this.writeTo(this.uri, cancellation);
    this.savedCells = this.cells;
    this.dirty = false;
    this.changeEmitter.fire(this.snapshot());
  }

  async writeTo(uri: vscode.Uri, cancellation?: vscode.CancellationToken): Promise<void> {
    if (cancellation?.isCancellationRequested) {
      return;
    }

    const bytes = bytesFromCells(this.cells);
    if (cancellation?.isCancellationRequested) {
      return;
    }

    await vscode.workspace.fs.writeFile(uri, bytes);
  }

  async revert(): Promise<void> {
    const bytes = await vscode.workspace.fs.readFile(this.uri);
    this.cells = cellsFromBytes(bytes);
    this.savedCells = cellsFromBytes(bytes);
    this.dirty = false;
    this.changeEmitter.fire(this.snapshot());
  }
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
