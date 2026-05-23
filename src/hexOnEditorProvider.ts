import * as vscode from 'vscode';
import { HexOnDocument } from './hexOnDocument';
import type { FromWebviewMessage, ToWebviewMessage } from './protocol';
import type { SessionRegistry } from './sessionRegistry';

export class HexOnEditorProvider implements vscode.CustomEditorProvider<HexOnDocument> {
  static readonly viewType = 'ibmZHexEditor.hexOn';

  private readonly changeEmitter = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<HexOnDocument>>();
  readonly onDidChangeCustomDocument = this.changeEmitter.event;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly sessions: SessionRegistry,
  ) {}

  async openCustomDocument(uri: vscode.Uri): Promise<HexOnDocument> {
    return HexOnDocument.create(uri, this.sessions.take(uri));
  }

  async resolveCustomEditor(document: HexOnDocument, webviewPanel: vscode.WebviewPanel): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview')],
    };

    webviewPanel.webview.html = this.html(webviewPanel.webview);

    const disposables: vscode.Disposable[] = [];
    disposables.push(document.onDidChangeSnapshot(snapshot => {
      this.post(webviewPanel.webview, { type: 'snapshot', snapshot });
    }));
    disposables.push(webviewPanel.webview.onDidReceiveMessage((message: FromWebviewMessage) => {
      this.handleMessage(document, webviewPanel.webview, message);
    }));
    webviewPanel.onDidDispose(() => disposables.forEach(disposable => disposable.dispose()));
  }

  async saveCustomDocument(document: HexOnDocument, cancellation: vscode.CancellationToken): Promise<void> {
    await document.save(cancellation);
    const column = document.sourceViewColumn ?? vscode.ViewColumn.Active;
    await vscode.commands.executeCommand('vscode.openWith', document.uri, 'default', {
      viewColumn: column,
      preview: false,
    });
  }

  async saveCustomDocumentAs(
    document: HexOnDocument,
    destination: vscode.Uri,
    cancellation: vscode.CancellationToken,
  ): Promise<void> {
    await document.writeTo(destination, cancellation);
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
      return;
    }

    if (message.type === 'save') {
      void vscode.commands.executeCommand('workbench.action.files.save');
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
    }
  }

  private post(webview: vscode.Webview, message: ToWebviewMessage): void {
    void webview.postMessage(message);
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
