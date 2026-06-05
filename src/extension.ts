import * as vscode from 'vscode';
import { HexOnEditorProvider } from './hexOnEditorProvider';
import {
  COMMON_SOURCE_ENCODINGS,
  getDocumentEncoding,
  isKnownVsCodeTextEncoding,
  normalizeEncoding,
} from './encoding';
import {
  getIbmDbcsProfiles,
  getIbmSbcsProfiles,
  isSupportedIbmCodePageEncoding,
  looksLikeIbmCodePageEncoding,
} from './codePages';
import { SessionRegistry } from './sessionRegistry';
import { encodingDescriptions, extensionText } from './i18n';
import { inferFixedRecordMetadataFromZoweTrace, recordMetadataFromZoweStats } from './recordMetadata';
import type { ByteSourceKind } from './protocol';
import {
  asZoweTreeResource,
  isSupportedResourceUri,
  isZoweResourceUri,
  traceZoweDatasetStats,
  type ZoweDatasetStatsTrace,
  type ZoweTreeResource,
} from './resourceSupport';

interface EncodingQuickPickItem extends vscode.QuickPickItem {
  value?: string;
}

interface ActiveResource {
  uri: vscode.Uri;
  viewColumn: vscode.ViewColumn | undefined;
  document?: vscode.TextDocument;
  dirty: boolean;
  zoweTreeResource?: ZoweTreeResource;
}

export function activate(context: vscode.ExtensionContext): void {
  const sessions = new SessionRegistry();
  const provider = new HexOnEditorProvider(context, sessions);
  const diagnosticsOutput = vscode.window.createOutputChannel('IBM Z HEX ON Diagnostics');

  context.subscriptions.push(
    diagnosticsOutput,
    vscode.window.registerCustomEditorProvider(HexOnEditorProvider.viewType, provider, {
      supportsMultipleEditorsPerDocument: false,
    }),
    vscode.commands.registerCommand('ibmZHexEditor.openHexOn', async (resource?: unknown) => {
      await openHexOn(sessions, diagnosticsOutput, resource);
    }),
  );
}

export function deactivate(): void {}

async function openHexOn(
  sessions: SessionRegistry,
  diagnosticsOutput: vscode.OutputChannel,
  resource?: unknown,
): Promise<void> {
  const active = getActiveResource(resource);
  if (!active) {
    void vscode.window.showWarningMessage(extensionText.openLocalFileWarning());
    return;
  }

  if (!isSupportedResourceUri(active.uri)) {
    void vscode.window.showWarningMessage(extensionText.unsupportedResourceWarning(active.uri.scheme));
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

  const byteSource = await prepareByteSource(active);

  const fileEncoding = await pickFileEncoding(active.document ? getDocumentEncoding(active.document) : undefined);
  if (!fileEncoding) {
    return;
  }

  const bytes = await vscode.workspace.fs.readFile(active.uri);
  const zoweStatsTrace = traceZoweDatasetStats(active.zoweTreeResource);
  const recordMetadata = recordMetadataFromZoweStats(zoweStatsTrace.selectedStats)
    ?? inferFixedRecordMetadataFromZoweTrace(bytes, zoweStatsTrace);
  logZoweMetadataTrace(active, resource, zoweStatsTrace, recordMetadata, byteSource, diagnosticsOutput);

  sessions.set(active.uri, {
    fileEncoding,
    byteSource,
    bytes,
    sourceViewColumn: active.viewColumn,
    zoweTreeResource: active.zoweTreeResource,
    recordMetadata,
  });

  await vscode.commands.executeCommand('vscode.openWith', active.uri, HexOnEditorProvider.viewType, {
    viewColumn: active.viewColumn ?? vscode.ViewColumn.Active,
    preview: false,
  });
}

function logZoweMetadataTrace(
  active: ActiveResource,
  resource: unknown,
  trace: ZoweDatasetStatsTrace,
  recordMetadata: ReturnType<typeof recordMetadataFromZoweStats>,
  byteSource: ByteSourceKind,
  output: vscode.OutputChannel,
): void {
  if (!isZoweResourceUri(active.uri) || !isDiagnosticsLoggingEnabled(active.uri)) {
    return;
  }

  output.appendLine(`[${new Date().toISOString()}] zowe.metadata ${[
    field('activeScheme', active.uri.scheme),
    field('activePath', active.uri.path),
    field('hasCommandArg', resource !== undefined),
    field('commandArgType', describeUnknown(resource)),
    field('hasTreeResource', active.zoweTreeResource !== undefined),
    field('treeResourceScheme', active.zoweTreeResource?.resourceUri.scheme ?? null),
    field('treeResourcePath', active.zoweTreeResource?.resourceUri.path ?? null),
    field('resourceLabel', stringifyLight(trace.resourceLabel)),
    field('resourceContext', stringifyLight(trace.resourceContextValue)),
    field('hasParent', trace.hasParent),
    field('parentLabel', stringifyLight(trace.parentLabel)),
    field('parentContext', stringifyLight(trace.parentContextValue)),
    field('selectedStatsSource', trace.selectedSource),
    field('ownRecfm', statField(trace.ownStats?.recfm)),
    field('ownLrecl', statField(trace.ownStats?.lrecl)),
    field('ownBlksz', statField(trace.ownStats?.blksz)),
    field('parentRecfm', statField(trace.parentStats?.recfm)),
    field('parentLrecl', statField(trace.parentStats?.lrecl)),
    field('parentBlksz', statField(trace.parentStats?.blksz)),
    field('selectedRecfm', statField(trace.selectedStats?.recfm)),
    field('selectedLrecl', statField(trace.selectedStats?.lrecl)),
    field('selectedBlksz', statField(trace.selectedStats?.blksz)),
    field('recordMetadataSource', recordMetadata?.source ?? null),
    field('recordFormat', recordMetadata?.recordFormat ?? null),
    field('logicalRecordLength', recordMetadata?.logicalRecordLength ?? null),
    field('byteSource', byteSource),
  ].join(' ')}`);
}

async function prepareByteSource(active: ActiveResource): Promise<ByteSourceKind> {
  if (!isZoweResourceUri(active.uri)) {
    return 'local-raw';
  }

  if (!active.zoweTreeResource) {
    void vscode.window.showWarningMessage(extensionText.remoteRawModeWarning());
    return 'zowe-text-backed';
  }

  const confirmedRaw = await prepareZoweResourceForRawBytes(active.zoweTreeResource);
  if (!confirmedRaw) {
    void vscode.window.showWarningMessage(extensionText.remoteRawModeFailedWarning());
    return 'zowe-tree-unconfirmed';
  }

  return 'zowe-tree-raw';
}

function isDiagnosticsLoggingEnabled(resource: vscode.Uri): boolean {
  return vscode.workspace.getConfiguration('ibmZHexEditor', resource).get<boolean>('performanceLogging', false);
}

function field(name: string, value: string | number | boolean | null): string {
  return `${name}=${typeof value === 'string' ? JSON.stringify(value) : String(value)}`;
}

function statField(value: unknown): string | number | boolean | null {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return value === undefined ? null : stringifyLight(value);
}

function stringifyLight(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}

function describeUnknown(value: unknown): string {
  if (value === undefined) {
    return 'undefined';
  }
  if (value instanceof vscode.Uri) {
    return 'vscode.Uri';
  }
  if (value === null) {
    return 'null';
  }
  if (typeof value !== 'object') {
    return typeof value;
  }

  const keys = Object.keys(value as Record<string, unknown>).slice(0, 12);
  return `object:${keys.join(',')}`;
}

function getActiveResource(resource?: unknown): ActiveResource | undefined {
  const zoweTreeResource = asZoweTreeResource(resource);
  if (zoweTreeResource) {
    const active = activeResourceFromUri(zoweTreeResource.resourceUri);
    return {
      ...active,
      zoweTreeResource,
    };
  }

  if (resource instanceof vscode.Uri) {
    return activeResourceFromUri(resource);
  }

  const editor = vscode.window.activeTextEditor;
  if (editor && isSupportedResourceUri(editor.document.uri)) {
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

function activeResourceFromUri(uri: vscode.Uri): ActiveResource {
  const uriKey = uri.toString();
  const editor = vscode.window.visibleTextEditors.find(candidate => candidate.document.uri.toString() === uriKey);
  const document = editor?.document ?? vscode.workspace.textDocuments.find(candidate => candidate.uri.toString() === uriKey);
  const activeTab = findTabForUri(uriKey);

  return {
    uri,
    viewColumn: editor?.viewColumn ?? activeTab?.group.viewColumn ?? vscode.window.tabGroups.activeTabGroup.viewColumn,
    document,
    dirty: document?.isDirty ?? activeTab?.tab.isDirty ?? false,
  };
}

function findTabForUri(uriKey: string): { group: vscode.TabGroup; tab: vscode.Tab } | undefined {
  for (const group of vscode.window.tabGroups.all) {
    for (const tab of group.tabs) {
      const input = tab.input;
      if ((input instanceof vscode.TabInputText || input instanceof vscode.TabInputCustom) && input.uri.toString() === uriKey) {
        return { group, tab };
      }
    }
  }

  return undefined;
}

async function prepareZoweResourceForRawBytes(resource: ZoweTreeResource): Promise<boolean> {
  const before = await getZoweEncoding(resource);
  if (isBinaryZoweEncoding(before)) {
    return true;
  }

  await vscode.commands.executeCommand('zowe.openWithEncoding', resource, { kind: 'binary' });
  const after = await getZoweEncoding(resource);
  return isBinaryZoweEncoding(after);
}

async function getZoweEncoding(resource: ZoweTreeResource): Promise<unknown> {
  try {
    return await resource.getEncoding?.();
  } catch {
    return undefined;
  }
}

function isBinaryZoweEncoding(encoding: unknown): boolean {
  return typeof encoding === 'object'
    && encoding !== null
    && (encoding as { kind?: unknown }).kind === 'binary';
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
    {
      label: extensionText.ibmSbcsSeparator(),
      kind: vscode.QuickPickItemKind.Separator,
    },
    ...getIbmSbcsProfiles()
      .filter(profile => profile.id !== normalized)
      .map(profile => ({
        label: profile.label,
        description: encodingDescriptions[profile.id] ?? extensionText.ibmSbcsDescription(),
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
    ? await pickCustomEncoding(normalized)
    : picked.value;

  if (!encoding) {
    return undefined;
  }

  return encoding;
}

function encodingDescription(encoding: string): string | undefined {
  return encodingDescriptions[encoding];
}

async function pickCustomEncoding(currentEncoding: string): Promise<string | undefined> {
  const encoding = normalizeEncoding(await vscode.window.showInputBox({
    title: extensionText.inputEncodingTitle(),
    prompt: extensionText.inputEncodingPrompt(),
    value: currentEncoding,
  }));

  if (!encoding) {
    return undefined;
  }

  if (isSupportedIbmCodePageEncoding(encoding)) {
    return encoding;
  }

  if (isKnownVsCodeTextEncoding(encoding)) {
    try {
      const testBuffer = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
      await vscode.workspace.decode(testBuffer, { encoding });
    } catch (error) {
      void vscode.window.showErrorMessage(
        extensionText.invalidEncodingWarning(encoding, messageFromError(error)),
      );
      return undefined;
    }

    return encoding;
  }

  if (looksLikeIbmCodePageEncoding(encoding)) {
    const choice = await vscode.window.showWarningMessage(
      extensionText.unsupportedIbmEncodingWarning(encoding),
      { modal: true },
      extensionText.useAnyway(),
    );

    if (choice !== extensionText.useAnyway()) {
      return undefined;
    }

    return encoding;
  }

  void vscode.window.showErrorMessage(
    extensionText.invalidEncodingWarning(encoding, extensionText.unknownEncodingReason()),
  );
  return undefined;
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
