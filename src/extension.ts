import * as vscode from 'vscode';
import { HexOnEditorProvider } from './hexOnEditorProvider';
import {
  COMMON_SOURCE_ENCODINGS,
  getDocumentEncoding,
  normalizeEncoding,
} from './encoding';
import { getIbmDbcsProfiles } from './codePages';
import { SessionRegistry } from './sessionRegistry';
import { encodingDescriptions, extensionText } from './i18n';

interface EncodingQuickPickItem extends vscode.QuickPickItem {
  value?: string;
}

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
    void vscode.window.showWarningMessage(extensionText.openLocalFileWarning());
    return;
  }

  if (active.uri.scheme !== 'file') {
    void vscode.window.showWarningMessage(extensionText.localFilesOnlyWarning());
    return;
  }

  const maxKb = vscode.workspace.getConfiguration('ibmZHexEditor').get<number>('maxFileSizeKb', 1024);
  const stat = await vscode.workspace.fs.stat(active.uri);
  if (stat.size > maxKb * 1024) {
    void vscode.window.showWarningMessage(extensionText.fileSizeLimitWarning(maxKb));
    return;
  }

  if (active.dirty && !(await saveActiveResource(active))) {
    void vscode.window.showWarningMessage(extensionText.saveBeforeOpenWarning());
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
  const currentDescription = encodingDescription(normalized);
  const currentItem: EncodingQuickPickItem = currentEncoding
    ? {
      label: extensionText.currentEncodingLabel(normalized),
      description: currentDescription ? extensionText.referenceOnlyDescription(currentDescription) : extensionText.referenceOnly(),
      detail: extensionText.currentEncodingDetail(),
      value: normalized,
    }
    : {
      label: extensionText.utf8Label(),
      description: encodingDescriptions.utf8,
      value: 'utf8',
    };

  const items: EncodingQuickPickItem[] = [
    {
      label: extensionText.actualEncodingSeparator(),
      kind: vscode.QuickPickItemKind.Separator,
    },
    currentItem,
    ...getIbmDbcsProfiles()
      .filter(profile => profile.id !== normalized)
      .map(profile => ({
        label: profile.label,
        description: encodingDescriptions[profile.id] ?? extensionText.ibmDbcsDescription(),
        value: profile.id,
      })),
    ...(normalized !== 'utf8'
      ? [{
        label: extensionText.utf8Label(),
        description: encodingDescriptions.utf8,
        value: 'utf8',
      }]
      : []),
    {
      label: extensionText.otherEncodingsSeparator(),
      kind: vscode.QuickPickItemKind.Separator,
    },
    ...COMMON_SOURCE_ENCODINGS
      .filter(encoding => encoding !== normalized && encoding !== 'utf8')
      .map(encoding => ({
        label: encoding,
        description: encodingDescriptions[encoding] ?? extensionText.vscodeTextEncodingDescription(),
        value: encoding,
      })),
    {
      label: extensionText.customEncodingLabel(),
      description: extensionText.customEncodingDescription(),
      value: '__custom__',
    },
  ];

  const picked = await vscode.window.showQuickPick(items, {
    title: extensionText.encodingPickerTitle(),
    placeHolder: extensionText.encodingPickerPlaceholder(),
    matchOnDescription: true,
    matchOnDetail: true,
  });

  if (!picked) {
    return undefined;
  }

  if (!picked.value) {
    return undefined;
  }

  const encoding = picked.value === '__custom__'
    ? normalizeEncoding(await vscode.window.showInputBox({
      title: extensionText.inputEncodingTitle(),
      prompt: extensionText.inputEncodingPrompt(),
      value: normalized,
    }))
    : picked.value;

  if (!encoding) {
    return undefined;
  }

  return encoding;
}

function encodingDescription(encoding: string): string | undefined {
  return encodingDescriptions[encoding];
}
