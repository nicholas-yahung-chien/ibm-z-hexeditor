import * as vscode from 'vscode';
import { countDiagnosticProblems, summarizeProblemCounts } from './diagnosticsSummary';
import { HexOnDocument } from './hexOnDocument';
import {
  affectsDiagnosticsSettings,
  readDiagnosticsSettings,
  seedDefaultDbcsAmbiguousExclusionsIfNeeded,
} from './settings';
import { diagnosticKindLabels, extensionText } from './i18n';
import type { EditorViewSettings, FromWebviewMessage, PerformanceLogFields, ToWebviewMessage } from './protocol';
import type { SessionRegistry } from './sessionRegistry';

export class HexOnEditorProvider implements vscode.CustomEditorProvider<HexOnDocument> {
  static readonly viewType = 'ibmZHexEditor.hexOn';

  private readonly changeEmitter = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<HexOnDocument>>();
  readonly onDidChangeCustomDocument = this.changeEmitter.event;
  private readonly webviews = new Map<HexOnDocument, vscode.Webview>();
  private readonly performanceOutput: vscode.OutputChannel;
  private lastInvalidDiagnosticsSettingsWarning = '';

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly sessions: SessionRegistry,
  ) {
    this.performanceOutput = vscode.window.createOutputChannel('IBM Z HEX ON Performance');
    this.context.subscriptions.push(this.performanceOutput);
    this.context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => {
      if (
        event.affectsConfiguration('ibmZHexEditor.condenseMode') ||
        event.affectsConfiguration('ibmZHexEditor.showRuler') ||
        event.affectsConfiguration('ibmZHexEditor.performanceLogging')
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
    const start = performance.now();
    await seedDefaultDbcsAmbiguousExclusionsIfNeeded();
    const settings = readDiagnosticsSettings(uri);
    this.warnInvalidDiagnosticsSettings(settings.invalidRules);
    const document = await HexOnDocument.create(
      uri,
      this.sessions.take(uri),
      settings.options,
      (phase, fields) => this.logPerformance(uri, phase, fields),
    );
    this.logPerformance(uri, 'provider.openCustomDocument', {
      durationMs: elapsed(start),
      encoding: document.fileEncoding,
    });
    return document;
  }

  async resolveCustomEditor(document: HexOnDocument, webviewPanel: vscode.WebviewPanel): Promise<void> {
    const start = performance.now();
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview')],
    };

    webviewPanel.webview.html = this.html(webviewPanel.webview);
    this.webviews.set(document, webviewPanel.webview);
    this.logPerformance(document.uri, 'provider.resolveCustomEditor', {
      durationMs: elapsed(start),
    });

    const disposables: vscode.Disposable[] = [];
    disposables.push(document.onDidChangeSnapshot(snapshot => {
      this.post(webviewPanel.webview, { type: 'snapshot', snapshot }, document.uri, 'webview.snapshot');
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
    const start = performance.now();
    const webview = this.webviews.get(document);
    let problemCount = 0;
    try {
      problemCount = await this.confirmSaveWithProblems(document, cancellation);
      await document.save(cancellation);
    } catch (error) {
      this.postStatus(webview, isCancellationError(error) ? extensionText.saveCanceled() : extensionText.saveFailed(messageFromError(error)));
      throw error;
    }

    this.logPerformance(document.uri, 'provider.saveCustomDocument', {
      durationMs: elapsed(start),
      problemCount,
    });
    this.postStatus(webview, problemCount > 0 ? extensionText.savedWithProblems(problemCount) : extensionText.saved());
    const column = document.sourceViewColumn ?? vscode.ViewColumn.Active;
    try {
      await vscode.commands.executeCommand('vscode.openWith', document.uri, 'default', {
        viewColumn: column,
        preview: false,
      });
    } catch (error) {
      this.postStatus(webview, extensionText.savedButReopenFailed(messageFromError(error)));
    }
  }

  async saveCustomDocumentAs(
    document: HexOnDocument,
    destination: vscode.Uri,
    cancellation: vscode.CancellationToken,
  ): Promise<void> {
    const start = performance.now();
    const webview = this.webviews.get(document);
    try {
      const problemCount = await this.confirmSaveWithProblems(document, cancellation);
      await document.writeTo(destination, cancellation);
      this.logPerformance(document.uri, 'provider.saveCustomDocumentAs', {
        durationMs: elapsed(start),
        problemCount,
        destination: destination.fsPath || destination.toString(),
      });
      this.postStatus(webview, problemCount > 0 ? extensionText.savedWithProblems(problemCount) : extensionText.saved());
    } catch (error) {
      this.postStatus(webview, isCancellationError(error) ? extensionText.saveCanceled() : extensionText.saveFailed(messageFromError(error)));
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
      this.post(webview, { type: 'settings', settings: this.readViewSettings(document.uri) });
      this.post(webview, { type: 'init', snapshot: document.snapshot() }, document.uri, 'webview.init');
      return;
    }

    if (message.type === 'performanceLog') {
      this.logPerformance(document.uri, `webview.${message.phase}`, message.fields);
      return;
    }

    if (message.type === 'save') {
      this.postStatus(webview, extensionText.saving());
      void Promise.resolve(vscode.commands.executeCommand('workbench.action.files.save')).catch((error: unknown) => {
        this.post(webview, { type: 'error', message: extensionText.saveFailed(messageFromError(error)) });
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
        label: extensionText.replaceNibbleEditLabel(),
        undo: edit.undo,
        redo: edit.redo,
      });
      return;
    }

    if (message.type === 'insertByte') {
      const edit = document.insertByte(message.offset, message.value);
      this.changeEmitter.fire({
        document,
        label: extensionText.insertByteEditLabel(),
        undo: edit.undo,
        redo: edit.redo,
      });
      return;
    }

    if (message.type === 'deleteByte') {
      const edit = document.deleteByte(message.offset);
      this.changeEmitter.fire({
        document,
        label: extensionText.deleteByteEditLabel(),
        undo: edit.undo,
        redo: edit.redo,
      });
    }
  }

  private postWithPerformance(
    webview: vscode.Webview,
    message: ToWebviewMessage,
    resource: vscode.Uri,
    phase: string,
  ): void {
    const start = performance.now();
    const marked = this.isPerformanceLoggingEnabled(resource)
      ? { ...message, perf: { phase, sentEpochMs: Date.now() } }
      : message;
    void webview.postMessage(marked);
    this.logPerformance(resource, 'provider.postMessage', {
      durationMs: elapsed(start),
      messageType: message.type,
      phase,
    });
  }

  private logPerformance(resource: vscode.Uri, phase: string, fields: PerformanceLogFields = {}): void {
    if (!this.isPerformanceLoggingEnabled(resource)) {
      return;
    }

    const formattedFields = Object.entries(fields)
      .map(([key, value]) => `${key}=${formatPerformanceField(value)}`)
      .join(' ');
    const message = `[${new Date().toISOString()}] ${phase} file=${resource.fsPath || resource.toString()}${formattedFields ? ` ${formattedFields}` : ''}`;
    this.performanceOutput.appendLine(message);
    console.log(`IBM Z HEX ON Performance ${message}`);
  }

  private isPerformanceLoggingEnabled(resource: vscode.Uri): boolean {
    return vscode.workspace.getConfiguration('ibmZHexEditor', resource).get<boolean>('performanceLogging', false);
  }

  private post(webview: vscode.Webview, message: ToWebviewMessage, resource?: vscode.Uri, phase?: string): void {
    if (resource && phase) {
      this.postWithPerformance(webview, message, resource, phase);
      return;
    }

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
      performanceLogging: config.get<boolean>('performanceLogging', false),
      locale: vscode.env.language,
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

    const message = extensionText.invalidDbcsExclusionsWarning(invalidRules.join('; '));
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
        extensionText.reloadDiscardPrompt(),
        {
          modal: true,
          detail: extensionText.reloadDiscardDetail(),
        },
        extensionText.reloadFromDisk(),
      );

      if (choice !== extensionText.reloadFromDisk()) {
        return;
      }

      await this.revertActiveDocument();
      return;
    }

    await document.revert();
    this.post(webview, { type: 'snapshot', snapshot: document.snapshot() }, document.uri, 'webview.reloadSnapshot');
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

    const summary = summarizeProblemCounts(diagnostics, diagnosticKindLabels());
    const choice = await vscode.window.showWarningMessage(
      extensionText.saveProblemsPrompt(problemCount),
      {
        modal: true,
        detail: extensionText.saveProblemsDetail(summary),
      },
      extensionText.saveAnyway(),
    );

    if (choice !== extensionText.saveAnyway() || cancellation.isCancellationRequested) {
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
<html lang="${escapeHtmlAttribute(vscode.env.language)}">
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

function elapsed(start: number): number {
  return Number((performance.now() - start).toFixed(2));
}

function formatPerformanceField(value: string | number | boolean | null): string {
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  return String(value);
}

function isCancellationError(error: unknown): boolean {
  return error instanceof vscode.CancellationError;
}

function escapeHtmlAttribute(value: string): string {
  return value.replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
