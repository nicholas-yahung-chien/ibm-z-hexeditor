import * as vscode from 'vscode';
import { buildRecordsFromText, decodeRecordsToText, makeSnapshot, replaceNibble } from './recordModel';
import type { ByteCell, EditorSnapshot, HexNibble, RecordLine } from './protocol';
import type { HexOnSession } from './sessionRegistry';
import { encodeTextForFile } from './encoding';

export class HexOnDocument implements vscode.CustomDocument {
  private cells: ByteCell[];
  private savedCells: ByteCell[];
  private readonly lines: RecordLine[];
  private dirty = false;

  private readonly changeEmitter = new vscode.EventEmitter<EditorSnapshot>();
  readonly onDidChangeSnapshot = this.changeEmitter.event;

  constructor(
    readonly uri: vscode.Uri,
    readonly fileName: string,
    readonly sourceEncoding: string,
    readonly sourceViewColumn: vscode.ViewColumn | undefined,
    sourceText: string,
  ) {
    const records = buildRecordsFromText(sourceText);
    this.cells = records.cells;
    this.savedCells = records.cells;
    this.lines = records.lines;
  }

  static async create(uri: vscode.Uri, session: HexOnSession | undefined): Promise<HexOnDocument> {
    const document = session
      ? { getText: () => session.sourceText, encoding: session.sourceEncoding }
      : await vscode.workspace.openTextDocument(uri);

    return new HexOnDocument(
      uri,
      uri.fsPath || uri.path,
      session?.sourceEncoding ?? ((document as vscode.TextDocument & { encoding?: string }).encoding ?? 'utf8'),
      session?.sourceViewColumn,
      document.getText(),
    );
  }

  dispose(): void {
    this.changeEmitter.dispose();
  }

  snapshot(): EditorSnapshot {
    return makeSnapshot({
      uri: this.uri.toString(),
      fileName: this.fileName,
      sourceEncoding: this.sourceEncoding,
      cells: this.cells,
      lines: this.lines,
      dirty: this.dirty,
    });
  }

  replaceNibble(offset: number, nibble: HexNibble, digit: number): { undo: () => void; redo: () => void } {
    const before = this.cells;
    const after = replaceNibble(this.cells, offset, nibble, digit);

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

    const text = decodeRecordsToText(this.cells, this.lines);
    const bytes = await encodeTextForFile(text, this.sourceEncoding, uri);
    if (cancellation?.isCancellationRequested) {
      return;
    }

    await vscode.workspace.fs.writeFile(uri, bytes);
  }

  async revert(): Promise<void> {
    const document = await vscode.workspace.openTextDocument(this.uri);
    const records = buildRecordsFromText(document.getText());
    this.cells = records.cells;
    this.savedCells = records.cells;
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
