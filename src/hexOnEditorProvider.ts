import * as vscode from 'vscode';
import { countDiagnosticProblems, summarizeProblemCounts } from './diagnosticsSummary';
import { HexOnDocument } from './hexOnDocument';
import {
  affectsDiagnosticsSettings,
  readDiagnosticsSettings,
  seedDefaultDbcsAmbiguousExclusionsIfNeeded,
} from './settings';
import type { EditorViewSettings, FromWebviewMessage, ToWebviewMessage } from './protocol';
import type { SessionRegistry } from './sessionRegistry';

export class HexOnEditorProvider implements vscode.CustomEditorProvider<HexOnDocument> {
  static readonly viewType = 'ibmZHexEditor.hexOn';

  private readonly changeEmitter = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<HexOnDocument>>();
  readonly onDidChangeCustomDocument = this.changeEmitter.event;
  private readonly webviews = new Map<HexOnDocument, vscode.Webview>();
  private lastInvalidDiagnosticsSettingsWarning = '';

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly sessions: SessionRegistry,
  ) {
    this.context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => {
      if (
        event.affectsConfiguration('ibmZHexEditor.condenseMode') ||
        event.affectsConfiguration('ibmZHexEditor.showRuler')
      ) {
        for (const [document, webview] of this.webviews) {
          this.post(webview, { type: 'settings', settings: this.readViewSettings(document.uri) });
        }
      }

      if (affectsDiagnosticsSettings(event)) {
        void this.refreshDiagnosticsSettings();
      }
    }));
  }

  async openCustomDocument(uri: vscode.Uri): Promise<HexOnDocument> {
    await seedDefaultDbcsAmbiguousExclusionsIfNeeded();
    const settings = readDiagnosticsSettings(uri);
    this.warnInvalidDiagnosticsSettings(settings.invalidRules);
    return HexOnDocument.create(uri, this.sessions.take(uri), settings.options);
  }

  async resolveCustomEditor(document: HexOnDocument, webviewPanel: vscode.WebviewPanel): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview')],
    };

    webviewPanel.webview.html = this.html(webviewPanel.webview);
    this.webviews.set(document, webviewPanel.webview);

    const disposables: vscode.Disposable[] = [];
    disposables.push(document.onDidChangeSnapshot(snapshot => {
      this.post(webviewPanel.webview, { type: 'snapshot', snapshot });
    }));
    disposables.push(webviewPanel.webview.onDidReceiveMessage((message: FromWebviewMessage) => {
      this.handleMessage(document, webviewPanel.webview, message);
    }));
    webviewPanel.onDidDispose(() => {
      this.webviews.delete(document);
      disposables.forEach(disposable => disposable.dispose());
    });
  }

  async saveCustomDocument(document: HexOnDocument, cancellation: vscode.CancellationToken): Promise<void> {
    const webview = this.webviews.get(document);
    let problemCount = 0;
    try {
      problemCount = await this.confirmSaveWithProblems(document, cancellation);
      await document.save(cancellation);
    } catch (error) {
      this.postStatus(webview, isCancellationError(error) ? 'Save canceled' : `Save failed: ${messageFromError(error)}`);
      throw error;
    }

    this.postStatus(webview, problemCount > 0 ? `Saved with ${problemCount} DBCS issue(s)` : 'Saved');
    const column = document.sourceViewColumn ?? vscode.ViewColumn.Active;
    try {
      await vscode.commands.executeCommand('vscode.openWith', document.uri, 'default', {
        viewColumn: column,
        preview: false,
      });
    } catch (error) {
      this.postStatus(webview, `Saved, but failed to reopen default editor: ${messageFromError(error)}`);
    }
  }

  async saveCustomDocumentAs(
    document: HexOnDocument,
    destination: vscode.Uri,
    cancellation: vscode.CancellationToken,
  ): Promise<void> {
    const webview = this.webviews.get(document);
    try {
      const problemCount = await this.confirmSaveWithProblems(document, cancellation);
      await document.writeTo(destination, cancellation);
      this.postStatus(webview, problemCount > 0 ? `Saved with ${problemCount} DBCS issue(s)` : 'Saved');
    } catch (error) {
      this.postStatus(webview, isCancellationError(error) ? 'Save canceled' : `Save failed: ${messageFromError(error)}`);
      throw error;
    }
  }

  revertCustomDocument(document: HexOnDocument): Thenable<void> {
    return document.revert();
  }

  backupCustomDocument(
    document: HexOnDocument,
    context: vscode.CustomDocumentBackupContext,
    cancellation: vscode.CancellationToken,
  ): Thenable<vscode.CustomDocumentBackup> {
    return document.writeTo(context.destination, cancellation).then(() => ({
      id: context.destination.toString(),
      delete: async () => {
        try {
          await vscode.workspace.fs.delete(context.destination);
        } catch {
          // Best-effort cleanup only.
        }
      },
    }));
  }

  private handleMessage(document: HexOnDocument, webview: vscode.Webview, message: FromWebviewMessage): void {
    if (message.type === 'ready') {
      this.post(webview, { type: 'init', snapshot: document.snapshot() });
      this.post(webview, { type: 'settings', settings: this.readViewSettings(document.uri) });
      return;
    }

    if (message.type === 'save') {
      this.postStatus(webview, 'Saving...');
      void Promise.resolve(vscode.commands.executeCommand('workbench.action.files.save')).catch((error: unknown) => {
        this.post(webview, { type: 'error', message: `Save failed: ${messageFromError(error)}` });
      });
      return;
    }

    if (message.type === 'revert') {
      void this.revertActiveDocument().catch(error => {
        this.post(webview, { type: 'error', message: messageFromError(error) });
      });
      return;
    }

    if (message.type === 'reload') {
      void this.reloadFromDisk(document, webview).catch(error => {
        this.post(webview, { type: 'error', message: messageFromError(error) });
      });
      return;
    }

    if (message.type === 'replaceNibble') {
      const edit = document.replaceNibble(message.offset, message.nibble, message.digit);
      this.changeEmitter.fire({
        document,
        label: 'Replace hex nibble',
        undo: edit.undo,
        redo: edit.redo,
      });
      return;
    }

    if (message.type === 'insertByte') {
      const edit = document.insertByte(message.offset, message.value);
      this.changeEmitter.fire({
        document,
        label: 'Insert byte',
        undo: edit.undo,
        redo: edit.redo,
      });
      return;
    }

    if (message.type === 'deleteByte') {
      const edit = document.deleteByte(message.offset);
      this.changeEmitter.fire({
        document,
        label: 'Delete byte',
        undo: edit.undo,
        redo: edit.redo,
      });
    }
  }

  private post(webview: vscode.Webview, message: ToWebviewMessage): void {
    void webview.postMessage(message);
  }

  private postStatus(webview: vscode.Webview | undefined, message: string): void {
    if (webview) {
      this.post(webview, { type: 'status', message });
    }
  }

  private readViewSettings(resource: vscode.Uri): EditorViewSettings {
    const config = vscode.workspace.getConfiguration('ibmZHexEditor', resource);
    return {
      condenseMode: config.get<boolean>('condenseMode', false),
      showRuler: config.get<boolean>('showRuler', false),
    };
  }

  private async refreshDiagnosticsSettings(): Promise<void> {
    await seedDefaultDbcsAmbiguousExclusionsIfNeeded();

    for (const document of this.webviews.keys()) {
      const settings = readDiagnosticsSettings(document.uri);
      this.warnInvalidDiagnosticsSettings(settings.invalidRules);
      document.updateDiagnosticsOptions(settings.options);
    }
  }

  private warnInvalidDiagnosticsSettings(invalidRules: readonly string[]): void {
    if (invalidRules.length === 0) {
      return;
    }

    const message = `Ignoring invalid DBCS ambiguous exclusion rule(s): ${invalidRules.join('; ')}`;
    if (message === this.lastInvalidDiagnosticsSettingsWarning) {
      return;
    }

    this.lastInvalidDiagnosticsSettingsWarning = message;
    void vscode.window.showWarningMessage(message);
  }

  private async revertActiveDocument(): Promise<void> {
    await vscode.commands.executeCommand('workbench.action.files.revert');
  }

  private async reloadFromDisk(document: HexOnDocument, webview: vscode.Webview): Promise<void> {
    if (document.hasUnsavedChanges()) {
      const choice = await vscode.window.showWarningMessage(
        'Reload from disk and discard unsaved HEX ON edits?',
        {
          modal: true,
          detail: 'The editor will reread the file bytes from disk. Any unsaved hex changes in this editor will be discarded.',
        },
        'Reload From Disk',
      );

      if (choice !== 'Reload From Disk') {
        return;
      }

      await this.revertActiveDocument();
      return;
    }

    await document.revert();
    this.post(webview, { type: 'snapshot', snapshot: document.snapshot() });
  }

  private async confirmSaveWithProblems(document: HexOnDocument, cancellation: vscode.CancellationToken): Promise<number> {
    if (cancellation.isCancellationRequested) {
      throw new vscode.CancellationError();
    }

    const diagnostics = document.snapshot().diagnostics;
    const problemCount = countDiagnosticProblems(diagnostics);
    if (problemCount === 0) {
      return 0;
    }

    const summary = summarizeProblemCounts(diagnostics);
    const choice = await vscode.window.showWarningMessage(
      `Save ${problemCount} DBCS issue(s) to disk?`,
      {
        modal: true,
        detail: summary
          ? `Diagnostics currently reports: ${summary}. Saving will write the current raw bytes exactly as shown in the HEX ON editor.`
          : 'Saving will write the current raw bytes exactly as shown in the HEX ON editor.',
      },
      'Save Anyway',
    );

    if (choice !== 'Save Anyway' || cancellation.isCancellationRequested) {
      throw new vscode.CancellationError();
    }

    return problemCount;
  }

  private html(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'assets', 'index.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'assets', 'index.css'));
    const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.css'));
    const nonce = crypto.randomUUID();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
  <link href="${codiconsUri}" rel="stylesheet">
  <link href="${styleUri}" rel="stylesheet">
  <title>IBM Z HEX ON Editor</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isCancellationError(error: unknown): boolean {
  return error instanceof vscode.CancellationError;
}
