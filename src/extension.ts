import * as vscode from 'vscode';
import { HexOnEditorProvider } from './hexOnEditorProvider';
import { getDocumentEncoding, normalizeEncoding, SUPPORTED_SOURCE_ENCODINGS } from './encoding';
import { SessionRegistry } from './sessionRegistry';

export function activate(context: vscode.ExtensionContext): void {
  const sessions = new SessionRegistry();
  const provider = new HexOnEditorProvider(context, sessions);

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(HexOnEditorProvider.viewType, provider, {
      supportsMultipleEditorsPerDocument: false,
    }),
    vscode.commands.registerCommand('ibmZHexEditor.openHexOn', async () => {
      await openHexOn(sessions);
    }),
  );
}

export function deactivate(): void {}

async function openHexOn(sessions: SessionRegistry): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    void vscode.window.showWarningMessage('Open a text file before starting HEX ON editing.');
    return;
  }

  const document = editor.document;
  if (document.uri.scheme !== 'file') {
    void vscode.window.showWarningMessage('HEX ON editing currently supports local files only.');
    return;
  }

  const maxKb = vscode.workspace.getConfiguration('ibmZHexEditor').get<number>('maxFileSizeKb', 1024);
  const stat = await vscode.workspace.fs.stat(document.uri);
  if (stat.size > maxKb * 1024) {
    void vscode.window.showWarningMessage(`This MVP opens files up to ${maxKb} KB.`);
    return;
  }

  const sourceEncoding = await pickSourceEncoding(getDocumentEncoding(document));
  if (!sourceEncoding) {
    return;
  }

  const hexEncoding = await vscode.window.showQuickPick([
    {
      label: 'IBM-937',
      description: 'Traditional Chinese EBCDIC with DBCS SO/SI validation',
      value: 'ibm937' as const,
    },
  ], {
    placeHolder: 'Select the IBM Z code page for the hex rows',
  });

  if (!hexEncoding) {
    return;
  }

  if (document.isDirty && !(await document.save())) {
    void vscode.window.showWarningMessage('Please save the current file before opening HEX ON editing.');
    return;
  }

  sessions.set(document.uri, {
    sourceEncoding,
    sourceText: document.getText(),
    sourceViewColumn: editor.viewColumn,
  });

  await vscode.commands.executeCommand('vscode.openWith', document.uri, HexOnEditorProvider.viewType, {
    viewColumn: editor.viewColumn ?? vscode.ViewColumn.Active,
    preview: false,
  });
}

async function pickSourceEncoding(currentEncoding: string): Promise<string | undefined> {
  const normalized = normalizeEncoding(currentEncoding);
  const items = [
    {
      label: 'Use current VS Code text',
      description: normalized,
      detail: 'MVP path: use VS Code decoded Unicode text and save back with this file encoding.',
      value: normalized,
    },
    {
      label: 'UTF-8',
      description: 'Force UTF-8',
      value: 'utf8',
    },
  ];

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select the source file encoding',
  });

  if (!picked) {
    return undefined;
  }

  if (!SUPPORTED_SOURCE_ENCODINGS.has(picked.value)) {
    const proceed = await vscode.window.showWarningMessage(
      `This MVP is safest with UTF-8 files. VS Code reports "${picked.value}". Continue using VS Code's decoded text anyway?`,
      { modal: true },
      'Continue',
    );
    return proceed === 'Continue' ? picked.value : undefined;
  }

  return picked.value;
}
