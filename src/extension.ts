import * as vscode from 'vscode';
import { HexOnEditorProvider } from './hexOnEditorProvider';
import {
  COMMON_SOURCE_ENCODINGS,
  getDocumentEncoding,
  normalizeEncoding,
} from './encoding';
import { getIbmDbcsProfiles } from './codePages';
import { SessionRegistry } from './sessionRegistry';

interface EncodingQuickPickItem extends vscode.QuickPickItem {
  value?: string;
}

interface ActiveResource {
  uri: vscode.Uri;
  viewColumn: vscode.ViewColumn | undefined;
  document?: vscode.TextDocument;
  dirty: boolean;
}

const IBM_DBCS_ENCODING_DESCRIPTIONS: Record<string, string> = {
  ibm930: 'Japanese Katakana-Kanji EBCDIC DBCS / 日本語',
  ibm933: 'Korean EBCDIC DBCS / 한국어',
  ibm935: 'Simplified Chinese EBCDIC DBCS / 简体中文',
  ibm937: 'Traditional Chinese EBCDIC DBCS / 繁體中文',
  ibm939: 'Japanese Latin-Kanji EBCDIC DBCS / 日本語',
  ibm1364: 'Extended Korean EBCDIC DBCS / 한국어',
  ibm1371: 'Extended Traditional Chinese EBCDIC DBCS / 繁體中文',
  ibm1388: 'Simplified Chinese GB 18030 Host DBCS / 简体中文',
  ibm1390: 'Extended Japanese Katakana-Kanji EBCDIC DBCS / 日本語',
  ibm1399: 'Extended Japanese Latin-Kanji EBCDIC DBCS / 日本語',
};

const COMMON_ENCODING_DESCRIPTIONS: Record<string, string> = {
  utf8: 'Unicode UTF-8 text',
  utf8bom: 'Unicode UTF-8 with BOM',
  utf16le: 'Unicode UTF-16 little endian',
  utf16be: 'Unicode UTF-16 big endian',
  cp950: 'Traditional Chinese Big5 / 繁體中文',
  big5hkscs: 'Traditional Chinese Big5-HKSCS / 繁體中文',
  shiftjis: 'Japanese Shift JIS / 日本語',
  eucjp: 'Japanese EUC-JP / 日本語',
  euckr: 'Korean EUC-KR / 한국어',
  gbk: 'Simplified Chinese GBK / 简体中文',
  gb18030: 'Simplified Chinese GB 18030 / 简体中文',
  windows1252: 'Western European Windows-1252',
  windows1250: 'Central European Windows-1250',
  windows1251: 'Cyrillic Windows-1251',
  windows1253: 'Greek Windows-1253',
  windows1254: 'Turkish Windows-1254',
  windows1255: 'Hebrew Windows-1255',
  windows1256: 'Arabic Windows-1256',
  windows1257: 'Baltic Windows-1257',
  windows1258: 'Vietnamese Windows-1258 / Tiếng Việt',
  iso88591: 'Western European ISO-8859-1',
  iso88592: 'Central European ISO-8859-2',
  iso88595: 'Cyrillic ISO-8859-5',
};

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
  const currentDescription = encodingDescription(normalized);
  const currentItem: EncodingQuickPickItem = currentEncoding
    ? {
      label: `Use VS Code-reported encoding: ${normalized}`,
      description: currentDescription ? `Reference only: ${currentDescription}` : 'Reference only',
      detail: 'Use only when the bytes on disk are actually encoded this way.',
      value: normalized,
    }
    : {
      label: 'UTF-8',
      description: COMMON_ENCODING_DESCRIPTIONS.utf8,
      detail: 'Default when VS Code has no text encoding to report.',
      value: 'utf8',
    };

  const items: EncodingQuickPickItem[] = [
    {
      label: 'Choose the actual file-content encoding',
      kind: vscode.QuickPickItemKind.Separator,
    },
    currentItem,
    ...getIbmDbcsProfiles()
      .filter(profile => profile.id !== normalized)
      .map(profile => ({
        label: profile.label,
        description: IBM_DBCS_ENCODING_DESCRIPTIONS[profile.id] ?? 'IBM EBCDIC DBCS with SO/SI diagnostics',
        detail: 'Enables SO/SI and DBCS diagnostics.',
        value: profile.id,
      })),
    ...(normalized !== 'utf8'
      ? [{
        label: 'UTF-8',
        description: COMMON_ENCODING_DESCRIPTIONS.utf8,
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
        description: COMMON_ENCODING_DESCRIPTIONS[encoding] ?? 'VS Code text encoding',
        value: encoding,
      })),
    {
      label: 'Enter another encoding...',
      description: 'Custom VS Code encoding id',
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

  if (!picked.value) {
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

function encodingDescription(encoding: string): string | undefined {
  return IBM_DBCS_ENCODING_DESCRIPTIONS[encoding] ?? COMMON_ENCODING_DESCRIPTIONS[encoding];
}
