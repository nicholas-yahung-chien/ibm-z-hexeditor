import * as vscode from 'vscode';
import { countDiagnosticProblems, summarizeProblemCounts } from './diagnosticsSummary';
import { HexOnDocument } from './hexOnDocument';
import {
  affectsDiagnosticsSettings,
  readDiagnosticsSettings,
  seedDefaultDbcsAmbiguousExclusionsIfNeeded,
} from './settings';
import { normalizePageLineLimit, PAGE_LINE_COUNT } from './paging';
import { diagnosticKindLabels, extensionText } from './i18n';
import { isSupportedResourceUri } from './resourceSupport';
import { isZoweDataSetUnsafeUploadError } from './saveErrors';
import { roundTripTextConversion } from './textRoundTrip';
import { fixedRecordLength } from './recordMetadata';
import { canAttemptZoweDirectBinaryUpload, tryZoweDirectBinaryUpload } from './zoweBinaryUpload';
import type { EditorViewSettings, FromWebviewMessage, PerformanceLogFields, RenderMode, ToWebviewMessage } from './protocol';
import type { SessionRegistry } from './sessionRegistry';

function validateSupportedResourceUri(uri: vscode.Uri): void {
  if (!isSupportedResourceUri(uri)) {
    throw new Error(extensionText.localFilesOnlyWarning());
  }
}

export class HexOnEditorProvider implements vscode.CustomEditorProvider<HexOnDocument> {
  static readonly viewType = 'ibmZHexEditor.hexOn';

  private readonly changeEmitter = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<HexOnDocument>>();
  readonly onDidChangeCustomDocument = this.changeEmitter.event;
  private readonly webviews = new Map<HexOnDocument, vscode.Webview>();
  private readonly webviewNonces = new Map<vscode.Webview, string>();
  private readonly performanceOutput: vscode.OutputChannel;
  private lastInvalidDiagnosticsSettingsWarning = '';

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly sessions: SessionRegistry,
  ) {
    this.performanceOutput = vscode.window.createOutputChannel('IBM Z HEX ON Performance');
    this.context.subscriptions.push(this.performanceOutput);

    try {
      this.context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => {
        if (
          event.affectsConfiguration('ibmZHexEditor.condenseMode') ||
          event.affectsConfiguration('ibmZHexEditor.showRuler') ||
          event.affectsConfiguration('ibmZHexEditor.renderMode') ||
          event.affectsConfiguration('ibmZHexEditor.pageLineLimit') ||
          event.affectsConfiguration('ibmZHexEditor.performanceLogging')
        ) {
          for (const [document, webview] of this.webviews) {
            this.post(webview, { type: 'settings', settings: this.readViewSettings(document.uri) });
            this.postSnapshot(webview, document, 'snapshot', 'webview.settingsSnapshot');
          }
        }

        if (affectsDiagnosticsSettings(event)) {
          void this.refreshDiagnosticsSettings();
        }
      }));
    } catch (error) {
      // Ensure performanceOutput is disposed if configuration listener setup fails
      this.performanceOutput.dispose();
      throw error;
    }
  }

  async openCustomDocument(uri: vscode.Uri): Promise<HexOnDocument> {
    validateSupportedResourceUri(uri);
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
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'dist')],
    };

    const nonce = crypto.randomUUID();
    this.webviewNonces.set(webviewPanel.webview, nonce);
    webviewPanel.webview.html = this.html(webviewPanel.webview, nonce);
    this.webviews.set(document, webviewPanel.webview);
    this.logPerformance(document.uri, 'provider.resolveCustomEditor', {
      durationMs: elapsed(start),
    });

    const disposables: vscode.Disposable[] = [];
    disposables.push(document.onDidChangeSnapshot(() => {
      this.postSnapshot(webviewPanel.webview, document, 'snapshot', 'webview.snapshot');
    }));
    disposables.push(webviewPanel.webview.onDidReceiveMessage((message: FromWebviewMessage) => {
      this.handleMessage(document, webviewPanel.webview, message);
    }));
    webviewPanel.onDidDispose(() => {
      this.webviews.delete(document);
      this.webviewNonces.delete(webviewPanel.webview);
      disposables.forEach(disposable => disposable.dispose());
    });
  }

  async saveCustomDocument(document: HexOnDocument, cancellation: vscode.CancellationToken): Promise<void> {
    const start = performance.now();
    const webview = this.webviews.get(document);
    let problemCount = 0;
    let saveStatus: string | undefined;
    try {
      problemCount = await this.confirmSaveWithProblems(document, cancellation);
      saveStatus = await this.tryPrimaryZoweDirectBinarySave(document, cancellation);
      if (!saveStatus) {
        await document.save(cancellation);
      }
    } catch (error) {
      try {
        saveStatus = await this.tryZoweUnsafeUploadSave(document, error, cancellation);
      } catch (fallbackError) {
        const saveError = formatSaveFailure(document.uri, fallbackError);
        this.postStatus(webview, saveError.status);
        throw saveError.error;
      }

      if (saveStatus) {
        // Continue through the normal post-save UI path.
      } else {
        const saveError = formatSaveFailure(document.uri, error);
        this.postStatus(webview, saveError.status);
        throw saveError.error;
      }
    }

    this.logPerformance(document.uri, 'provider.saveCustomDocument', {
      durationMs: elapsed(start),
      problemCount,
    });
    this.postStatus(webview, saveStatus
      ? saveStatus
      : problemCount > 0 ? extensionText.savedWithProblems(problemCount) : extensionText.saved());
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
      const saveError = formatSaveFailure(destination, error);
      this.postStatus(webview, saveError.status);
      throw saveError.error;
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
    // Verify message nonce for security
    const expectedNonce = this.webviewNonces.get(webview);
    if (!expectedNonce || message.nonce !== expectedNonce) {
      console.error('IBM Z HEX ON: Invalid message nonce, ignoring message');
      return;
    }

    switch (message.type) {
      case 'ready':
        this.post(webview, { type: 'settings', settings: this.readViewSettings(document.uri) });
        this.postSnapshot(webview, document, 'init', 'webview.init');
        return;
      case 'performanceLog':
        this.logPerformance(document.uri, `webview.${message.phase}`, message.fields);
        return;
      case 'save':
        this.postStatus(webview, extensionText.saving());
        this.handleMessageTask(
          webview,
          vscode.commands.executeCommand('workbench.action.files.save'),
          error => extensionText.saveFailed(messageFromError(error)),
        );
        return;
      case 'saveAs':
        this.handleMessageTask(webview, this.saveLocalCopy(document, webview), error => extensionText.saveFailed(messageFromError(error)));
        return;
      case 'revert':
        this.handleMessageTask(webview, this.revertActiveDocument());
        return;
      case 'reload':
        this.handleMessageTask(webview, this.reloadFromDisk(document, webview));
        return;
      case 'goToPage':
        this.handleMessageTask(webview, this.goToPage(document, webview, message.pageIndex));
        return;
      case 'replaceNibble':
        this.fireDocumentEdit(document, extensionText.replaceNibbleEditLabel(), document.replaceNibble(message.offset, message.nibble, message.digit));
        return;
      case 'insertByte':
        this.fireDocumentEdit(document, extensionText.insertByteEditLabel(), document.insertByte(message.offset, message.value));
        return;
      case 'deleteByte':
        this.fireDocumentEdit(document, extensionText.deleteByteEditLabel(), document.deleteByte(message.offset));
        return;
    }
  }

  private handleMessageTask(
    webview: vscode.Webview,
    task: Thenable<unknown> | Promise<unknown>,
    formatError: (error: unknown) => string = messageFromError,
  ): void {
    void Promise.resolve(task).catch((error: unknown) => {
      this.post(webview, { type: 'error', message: formatError(error) });
    });
  }

  private fireDocumentEdit(
    document: HexOnDocument,
    label: string,
    edit: { undo(): void; redo(): void },
  ): void {
    this.changeEmitter.fire({
      document,
      label,
      undo: edit.undo,
      redo: edit.redo,
    });
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
    // Only log the file name (not the full path) to avoid exposing sensitive information
    const fileName = resource.fsPath ? resource.fsPath.split(/[\\/]/).pop() : resource.toString();
    const message = `[${new Date().toISOString()}] ${phase} file=${fileName}${formattedFields ? ` ${formattedFields}` : ''}`;
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
      renderMode: this.readRenderMode(resource),
      pageLineLimit: this.readPageLineLimit(resource),
      performanceLogging: config.get<boolean>('performanceLogging', false),
      locale: vscode.env.language,
    };
  }

  private readRenderMode(resource: vscode.Uri): RenderMode {
    const configured = vscode.workspace.getConfiguration('ibmZHexEditor', resource).get<string>('renderMode', 'full');
    return configured === 'paged' ? 'paged' : 'full';
  }

  private readPageLineLimit(resource: vscode.Uri): number {
    const configured = vscode.workspace.getConfiguration('ibmZHexEditor', resource).get<number>('pageLineLimit', PAGE_LINE_COUNT);
    return normalizePageLineLimit(configured);
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
    this.postSnapshot(webview, document, 'snapshot', 'webview.reloadSnapshot');
  }

  private async saveLocalCopy(document: HexOnDocument, webview: vscode.Webview): Promise<void> {
    const destination = await vscode.window.showSaveDialog({
      title: extensionText.saveAsLocalTitle(),
      defaultUri: defaultLocalSaveUri(document.uri),
      filters: {
        [extensionText.saveAsLocalFilterName()]: ['*'],
      },
    });
    if (!destination) {
      this.postStatus(webview, extensionText.saveCanceled());
      return;
    }

    const cancellation = new vscode.CancellationTokenSource();
    try {
      const problemCount = await this.confirmSaveWithProblems(document, cancellation.token);
      await document.writeTo(destination, cancellation.token);
      this.postStatus(
        webview,
        problemCount > 0
          ? `${extensionText.saveAsLocalStatus(destination.fsPath)} (${extensionText.savedWithProblems(problemCount)})`
          : extensionText.saveAsLocalStatus(destination.fsPath),
      );
    } finally {
      cancellation.dispose();
    }
  }

  private async goToPage(document: HexOnDocument, webview: vscode.Webview, pageIndex: number): Promise<void> {
    if (document.hasUnsavedChanges()) {
      await vscode.window.showWarningMessage(
        extensionText.pageSwitchDirtyPrompt(),
        {
          modal: true,
          detail: extensionText.pageSwitchDirtyDetail(),
        },
      );
      return;
    }

    document.setPage(pageIndex, this.readPageLineLimit(document.uri));
    this.postSnapshot(webview, document, 'snapshot', 'webview.pageSnapshot');
  }

  private async confirmSaveWithProblems(document: HexOnDocument, cancellation: vscode.CancellationToken): Promise<number> {
    if (cancellation.isCancellationRequested) {
      throw new vscode.CancellationError();
    }

    const diagnostics = document.snapshot(this.readRenderMode(document.uri), this.readPageLineLimit(document.uri)).diagnostics;
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

  private async tryZoweUnsafeUploadSave(
    document: HexOnDocument,
    error: unknown,
    cancellation: vscode.CancellationToken,
  ): Promise<string | undefined> {
    const originalMessage = messageFromError(error);
    if (!isZoweDataSetUnsafeUploadError(document.uri.scheme, originalMessage)) {
      return undefined;
    }

    const recordLength = fixedRecordLength(document.recordMetadata);
    if (recordLength !== undefined) {
      const directUpload = await tryZoweDirectBinaryUpload({
        uri: document.uri,
        resource: document.zoweTreeResource,
        bytes: document.currentBytes(),
        recordMetadata: document.recordMetadata,
        log: (phase, fields) => this.logPerformance(document.uri, phase, fields),
      });
      if (directUpload.ok) {
        document.markSaved();
        return extensionText.zoweDirectBinarySaved();
      }
      this.logPerformance(document.uri, 'provider.zoweTextFallback.fixedRecordBlocked', {
        bytes: document.currentBytes().length,
        recordFormat: document.recordMetadata?.recordFormat ?? null,
        lrecl: recordLength,
        directBinaryAttempted: directUpload.attempted,
        directBinaryReason: directUpload.reason ?? null,
      });
      throw new Error(extensionText.zoweTextConvertedSaveFixedRecordUnavailable(
        document.recordMetadata?.recordFormat ?? 'fixed',
        recordLength,
      ));
    }

    const resource = document.zoweTreeResource;
    if (!resource?.setEncoding) {
      void vscode.window.showWarningMessage(extensionText.zoweTextConvertedSaveUnavailable());
      return undefined;
    }

    const action = extensionText.zoweTextConvertedSaveAction();
    const choice = await vscode.window.showWarningMessage(
      extensionText.zoweTextConvertedSavePrompt(),
      {
        modal: true,
        detail: extensionText.zoweTextConvertedSaveDetail(document.fileEncoding),
      },
      action,
    );
    if (choice !== action || cancellation.isCancellationRequested) {
      return undefined;
    }

    const roundTrip = roundTripTextConversion(document.currentBytes(), document.fileEncoding, document.recordMetadata);
    if (!roundTrip.ok) {
      if (roundTrip.reason === 'unsupported-encoding') {
        void vscode.window.showErrorMessage(extensionText.zoweTextConvertedSaveUnsupportedEncoding(document.fileEncoding));
      } else if (roundTrip.reason === 'fixed-record-unsupported') {
        void vscode.window.showErrorMessage(extensionText.zoweTextConvertedSaveFixedRecordUnavailable(
          document.recordMetadata?.recordFormat ?? 'fixed',
          fixedRecordLength(document.recordMetadata) ?? 0,
        ));
      } else {
        void vscode.window.showErrorMessage(extensionText.zoweTextConvertedSaveRoundTripFailed(document.fileEncoding, roundTrip.mismatchOffset ?? 0));
      }
      return undefined;
    }

    const previousEncoding = resource.getEncoding ? await resource.getEncoding() : undefined;
    const textBytes = new TextEncoder().encode(roundTrip.text);
    const textStats = textLineStats(roundTrip.text);
    const cacheUri = withQueryParam(document.uri, 'inDiff');
    const uploadUri = withQueryParam(document.uri, 'encoding', document.fileEncoding);
    this.logPerformance(document.uri, 'provider.zoweTextFallback.prepare', {
      bytes: document.currentBytes().length,
      textBytes: textBytes.length,
      lines: textStats.lineCount,
      maxLineLength: textStats.maxLineLength,
      recordFormat: document.recordMetadata?.recordFormat ?? null,
      lrecl: document.recordMetadata?.logicalRecordLength ?? null,
      cacheQuery: cacheUri.query,
      uploadQuery: uploadUri.query,
    });
    try {
      await resource.setEncoding({ kind: 'other', codepage: document.fileEncoding });
      await vscode.workspace.fs.writeFile(cacheUri, textBytes);
      this.logPerformance(document.uri, 'provider.zoweTextFallback.cacheUpdated', {
        textBytes: textBytes.length,
        lines: textStats.lineCount,
        maxLineLength: textStats.maxLineLength,
        cacheQuery: cacheUri.query,
      });
      await vscode.workspace.fs.writeFile(uploadUri, textBytes);
      this.logPerformance(document.uri, 'provider.zoweTextFallback.writeSucceeded', {
        textBytes: textBytes.length,
        uploadQuery: uploadUri.query,
      });
      const restored = await restoreZoweResourceAfterTextFallback(document, previousEncoding, (phase, fields) => {
        this.logPerformance(document.uri, phase, fields);
      });
      if (!restored) {
        void vscode.window.showWarningMessage(extensionText.zoweTextConvertedSaveRestoreWarning());
      }
      document.markSaved();
      return extensionText.zoweTextConvertedSaved();
    } catch (fallbackError) {
      this.logPerformance(document.uri, 'provider.zoweTextFallback.writeFailed', {
        textBytes: textBytes.length,
        lines: textStats.lineCount,
        maxLineLength: textStats.maxLineLength,
        uploadQuery: uploadUri.query,
        error: messageFromError(fallbackError),
      });
      await restoreZoweResourceAfterTextFallback(document, previousEncoding, (phase, fields) => {
        this.logPerformance(document.uri, phase, fields);
      });
      throw fallbackError;
    }
  }

  private async tryPrimaryZoweDirectBinarySave(
    document: HexOnDocument,
    cancellation: vscode.CancellationToken,
  ): Promise<string | undefined> {
    if (cancellation.isCancellationRequested || !canAttemptZoweDirectBinaryUpload({
      uri: document.uri,
      bytes: document.currentBytes(),
      recordMetadata: document.recordMetadata,
    })) {
      return undefined;
    }

    const directUpload = await tryZoweDirectBinaryUpload({
      uri: document.uri,
      resource: document.zoweTreeResource,
      bytes: document.currentBytes(),
      recordMetadata: document.recordMetadata,
      log: (phase, fields) => this.logPerformance(document.uri, phase, fields),
    });

    if (directUpload.ok) {
      document.markSaved();
      return extensionText.zoweDirectBinarySaved();
    }

    this.logPerformance(document.uri, 'provider.zoweDirectBinarySave.primaryUnavailable', {
      attempted: directUpload.attempted,
      reason: directUpload.reason ?? null,
      bytes: document.currentBytes().length,
      recordFormat: document.recordMetadata?.recordFormat ?? null,
      lrecl: document.recordMetadata?.logicalRecordLength ?? null,
    });
    return undefined;
  }

  private postSnapshot(
    webview: vscode.Webview,
    document: HexOnDocument,
    type: 'init' | 'snapshot' | 'saved',
    phase: string,
  ): void {
    this.post(webview, {
      type,
      snapshot: document.snapshot(this.readRenderMode(document.uri), this.readPageLineLimit(document.uri)),
    }, document.uri, phase);
  }

  private html(webview: vscode.Webview, messageNonce: string): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'assets', 'index.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'assets', 'index.css'));
    const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'codicons', 'codicon.css'));
    const cspNonce = crypto.randomUUID();

    return `<!DOCTYPE html>
<html lang="${escapeHtmlAttribute(vscode.env.language)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${cspNonce}';">
  <meta name="vscode-message-nonce" content="${escapeHtmlAttribute(messageNonce)}">
  <link href="${codiconsUri}" rel="stylesheet">
  <link href="${styleUri}" rel="stylesheet">
  <title>IBM Z HEX ON Editor</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${cspNonce}" type="module" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : (typeof error === 'object' ? JSON.stringify(error) : String(error));
}

function defaultLocalSaveUri(sourceUri: vscode.Uri): vscode.Uri | undefined {
  const fileName = sanitizeFileName(fileNameFromUri(sourceUri));
  const folder = vscode.workspace.workspaceFolders?.find(item => item.uri.scheme === 'file')?.uri;
  return folder ? vscode.Uri.joinPath(folder, fileName) : undefined;
}

function fileNameFromUri(uri: vscode.Uri): string {
  const segments = uri.path.split('/').filter(Boolean);
  const rawName = segments[segments.length - 1] ?? 'hex-on-bytes.bin';
  try {
    return decodeURIComponent(rawName);
  } catch {
    return rawName;
  }
}

function sanitizeFileName(fileName: string): string {
  const sanitized = fileName.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').trim();
  return sanitized || 'hex-on-bytes.bin';
}

function textLineStats(text: string): { lineCount: number; maxLineLength: number } {
  if (text.length === 0) {
    return { lineCount: 0, maxLineLength: 0 };
  }

  const lines = text.split('\n');
  return {
    lineCount: lines.length,
    maxLineLength: lines.reduce((max, line) => Math.max(max, line.length), 0),
  };
}

function withQueryParam(uri: vscode.Uri, key: string, value = 'true'): vscode.Uri {
  const query = new URLSearchParams(uri.query);
  query.set(key, value);
  return uri.with({ query: query.toString() });
}

async function restoreZoweResourceAfterTextFallback(
  document: HexOnDocument,
  previousEncoding: unknown,
  log?: (phase: string, fields: PerformanceLogFields) => void,
): Promise<boolean> {
  const resource = document.zoweTreeResource;
  const cacheUri = withQueryParam(document.uri, 'inDiff');
  try {
    if (!resource?.setEncoding || previousEncoding === undefined) {
      log?.('provider.zoweTextFallback.restoreSkipped', {
        hasResource: resource !== undefined,
        hasSetEncoding: resource?.setEncoding !== undefined,
        previousEncodingKind: zoweEncodingKind(previousEncoding),
      });
      return false;
    }

    await resource.setEncoding(previousEncoding);
    const restoredEncoding = resource.getEncoding ? await resource.getEncoding() : undefined;
    log?.('provider.zoweTextFallback.encodingRestored', {
      previousEncodingKind: zoweEncodingKind(previousEncoding),
      restoredEncodingKind: zoweEncodingKind(restoredEncoding),
    });
    await vscode.workspace.fs.writeFile(cacheUri, document.currentBytes());
    log?.('provider.zoweTextFallback.rawCacheRestored', {
      bytes: document.currentBytes().length,
      cacheQuery: cacheUri.query,
    });
    return true;
  } catch (error) {
    log?.('provider.zoweTextFallback.restoreFailed', {
      previousEncodingKind: zoweEncodingKind(previousEncoding),
      cacheQuery: cacheUri.query,
      error: messageFromError(error),
    });
    return false;
  }
}

function zoweEncodingKind(encoding: unknown): string | null {
  if (!encoding || typeof encoding !== 'object') {
    return encoding === undefined || encoding === null ? null : String(encoding);
  }

  const kind = (encoding as { kind?: unknown }).kind;
  if (typeof kind === 'string') {
    return kind;
  }

  return 'object';
}

function formatSaveFailure(uri: vscode.Uri, error: unknown): { status: string; error: unknown } {
  if (isCancellationError(error)) {
    return { status: extensionText.saveCanceled(), error };
  }

  const message = messageFromError(error);
  if (isZoweDataSetUnsafeUploadError(uri.scheme, message)) {
    const formatted = extensionText.zoweDataSetRawSaveBlocked(message);
    return { status: extensionText.saveFailed(formatted), error: new Error(formatted) };
  }

  return { status: extensionText.saveFailed(message), error };
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
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
