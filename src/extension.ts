import * as vscode from 'vscode';
import { HexOnEditorProvider } from './hexOnEditorProvider';
import {
  COMMON_SOURCE_ENCODINGS,
  decodeFileText,
  getDocumentEncoding,
  normalizeEncoding,
  PREFERRED_SOURCE_ENCODINGS,
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

  if (active.dirty && !(await saveActiveResource(active))) {
    void vscode.window.showWarningMessage('Please save the current file before opening HEX ON editing.');
    return;
  }

  const sourceEncoding = await pickSourceEncoding(active.document ? getDocumentEncoding(active.document) : undefined);
  if (!sourceEncoding) {
    return;
  }

  const sourceText = await decodeFileText(active.uri, sourceEncoding);

  sessions.set(active.uri, {
    sourceEncoding,
    sourceText,
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

async function pickSourceEncoding(currentEncoding: string | undefined): Promise<string | undefined> {
  const normalized = normalizeEncoding(currentEncoding);
  const currentItem = currentEncoding
    ? {
      label: `Use VS Code encoding: ${normalized}`,
      description: `${normalized} from the current TextDocument`,
      detail: 'Read raw file bytes and decode them with the encoding VS Code reports for the current text document.',
      value: normalized,
    }
    : {
      label: 'UTF-8',
      description: 'Default when the active tab is not a TextDocument',
      detail: 'Read raw file bytes and decode them as UTF-8.',
      value: 'utf8',
    };

  const items = [
    currentItem,
    ...(normalized !== 'utf8'
      ? [{
        label: 'UTF-8',
        description: 'Decode raw bytes as UTF-8',
        value: 'utf8',
      }]
      : []),
    ...COMMON_SOURCE_ENCODINGS
      .filter(encoding => encoding !== normalized && encoding !== 'utf8')
      .map(encoding => ({
        label: encoding,
        description: 'Decode raw bytes using this VS Code encoding id',
        value: encoding,
      })),
    {
      label: 'Enter another encoding...',
      description: 'Use a VS Code encoding id such as cp950, big5hkscs, shiftjis',
      value: '__custom__',
    },
  ];

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select how to decode the source file before IBM-937 hex editing',
    matchOnDescription: true,
    matchOnDetail: true,
  });

  if (!picked) {
    return undefined;
  }

  const encoding = picked.value === '__custom__'
    ? normalizeEncoding(await vscode.window.showInputBox({
      title: 'Source file encoding',
      prompt: 'Enter a VS Code encoding id. Examples: utf8, cp950, big5hkscs, shiftjis, gbk.',
      value: normalized,
    }))
    : picked.value;

  if (!encoding) {
    return undefined;
  }

  if (!PREFERRED_SOURCE_ENCODINGS.has(encoding)) {
    const proceed = await vscode.window.showWarningMessage(
      `This MVP is primarily validated with UTF-8 source files. Continue by decoding and later saving the file as "${encoding}"?`,
      { modal: true },
      'Continue',
    );
    return proceed === 'Continue' ? encoding : undefined;
  }

  return encoding;
}
