import * as vscode from 'vscode';
import { HexOnEditorProvider } from './hexOnEditorProvider';
import {
  COMMON_SOURCE_ENCODINGS,
  getDocumentEncoding,
  normalizeEncoding,
} from './encoding';
import { SessionRegistry } from './sessionRegistry';

interface ActiveResource {
  uri: vscode.Uri;
  viewColumn: vscode.ViewColumn | undefined;
  document?: vscode.TextDocument;
  dirty: boolean;
}

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
  const active = getActiveResource();
  if (!active) {
    void vscode.window.showWarningMessage('Open a local file before starting HEX ON editing.');
    return;
  }

  if (active.uri.scheme !== 'file') {
    void vscode.window.showWarningMessage('HEX ON editing currently supports local files only.');
    return;
  }

  const maxKb = vscode.workspace.getConfiguration('ibmZHexEditor').get<number>('maxFileSizeKb', 1024);
  const stat = await vscode.workspace.fs.stat(active.uri);
  if (stat.size > maxKb * 1024) {
    void vscode.window.showWarningMessage(`This MVP opens files up to ${maxKb} KB.`);
    return;
  }

  if (active.dirty && !(await saveActiveResource(active))) {
    void vscode.window.showWarningMessage('Please save the current file before opening HEX ON editing.');
    return;
  }

  const fileEncoding = await pickFileEncoding(active.document ? getDocumentEncoding(active.document) : undefined);
  if (!fileEncoding) {
    return;
  }

  const bytes = await vscode.workspace.fs.readFile(active.uri);

  sessions.set(active.uri, {
    fileEncoding,
    bytes,
    sourceViewColumn: active.viewColumn,
  });

  await vscode.commands.executeCommand('vscode.openWith', active.uri, HexOnEditorProvider.viewType, {
    viewColumn: active.viewColumn ?? vscode.ViewColumn.Active,
    preview: false,
  });
}

function getActiveResource(): ActiveResource | undefined {
  const editor = vscode.window.activeTextEditor;
  if (editor?.document.uri.scheme === 'file') {
    return {
      uri: editor.document.uri,
      viewColumn: editor.viewColumn,
      document: editor.document,
      dirty: editor.document.isDirty,
    };
  }

  const group = vscode.window.tabGroups.activeTabGroup;
  const tab = group.activeTab;
  const input = tab?.input;
  if (input instanceof vscode.TabInputText || input instanceof vscode.TabInputCustom) {
    return {
      uri: input.uri,
      viewColumn: group.viewColumn,
      dirty: tab?.isDirty ?? false,
    };
  }

  return undefined;
}

async function saveActiveResource(active: ActiveResource): Promise<boolean> {
  if (active.document) {
    return active.document.save();
  }

  await vscode.commands.executeCommand('workbench.action.files.save');
  return !vscode.window.tabGroups.activeTabGroup.activeTab?.isDirty;
}

async function pickFileEncoding(currentEncoding: string | undefined): Promise<string | undefined> {
  const normalized = normalizeEncoding(currentEncoding);
  const currentItem = currentEncoding
    ? {
      label: `Use VS Code-reported encoding: ${normalized}`,
      description: 'Reference only; confirm this is the actual file-content encoding',
      detail: 'HEX ON reads raw bytes from disk. Use this only if the file bytes are actually encoded this way.',
      value: normalized,
    }
    : {
      label: 'UTF-8',
      description: 'Default file-content encoding when VS Code has no text encoding to report',
      detail: 'HEX ON reads raw bytes from disk and previews those bytes as UTF-8.',
      value: 'utf8',
    };

  const items = [
    {
      label: 'Choose the actual file-content encoding',
      kind: vscode.QuickPickItemKind.Separator,
    },
    currentItem,
    ...(normalized !== 'ibm937'
      ? [{
        label: 'IBM-937',
        description: 'Use when the file bytes are IBM-937/EBCDIC; enables SO/SI diagnostics',
        detail: 'Choose this even if VS Code currently displayed the file as UTF-8 but the bytes are actually IBM-937.',
        value: 'ibm937',
      }]
      : []),
    ...(normalized !== 'utf8'
      ? [{
        label: 'UTF-8',
        description: 'Use when the file bytes are actually UTF-8',
        value: 'utf8',
      }]
      : []),
    {
      label: 'Other common content encodings',
      kind: vscode.QuickPickItemKind.Separator,
    },
    ...COMMON_SOURCE_ENCODINGS
      .filter(encoding => encoding !== normalized && encoding !== 'utf8')
      .map(encoding => ({
        label: encoding,
        description: 'Interpret raw file bytes using this VS Code encoding id',
        value: encoding,
      })),
    {
      label: 'Enter another encoding...',
      description: 'Enter the actual file-content encoding id',
      detail: 'Examples: cp950, big5hkscs, shiftjis, gbk.',
      value: '__custom__',
    },
  ];

  const picked = await vscode.window.showQuickPick(items, {
    title: 'IBM Z HEX ON Editor',
    placeHolder: 'Select the actual file-content encoding used to decode raw bytes for preview and diagnostics',
    matchOnDescription: true,
    matchOnDetail: true,
  });

  if (!picked) {
    return undefined;
  }

  const encoding = picked.value === '__custom__'
    ? normalizeEncoding(await vscode.window.showInputBox({
      title: 'Actual File-Content Encoding',
      prompt: 'Enter the encoding of the bytes on disk, using a VS Code encoding id. Examples: utf8, cp950, big5hkscs, shiftjis, gbk.',
      value: normalized,
    }))
    : picked.value;

  if (!encoding) {
    return undefined;
  }

  return encoding;
}
