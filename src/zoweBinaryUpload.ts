import * as vscode from 'vscode';
import type { RecordMetadata } from './protocol';
import { fixedRecordLength } from './recordMetadata';
import type { ZoweTreeResource } from './resourceSupport';

export interface ZoweBinaryUploadResult {
  attempted: boolean;
  ok: boolean;
  reason?: string;
}

export interface ZoweBinaryUploadArgs {
  uri: vscode.Uri;
  resource: ZoweTreeResource | undefined;
  bytes: Uint8Array;
  recordMetadata: RecordMetadata | undefined;
  log?: (phase: string, fields: Record<string, string | number | boolean | null>) => void;
}

interface ZoweApiRegister {
  getMvsApi?: (profile: unknown) => {
    uploadFromBuffer?: (buffer: Buffer, dataSetName: string, options?: Record<string, unknown>) => Promise<unknown>;
  };
}

export function canAttemptZoweDirectBinaryUpload(args: Pick<ZoweBinaryUploadArgs, 'uri' | 'bytes' | 'recordMetadata'>): boolean {
  const recordLength = fixedRecordLength(args.recordMetadata);
  return args.uri.scheme === 'zowe-ds'
    && recordLength !== undefined
    && recordLength > 0
    && args.bytes.length % recordLength === 0;
}

export async function tryZoweDirectBinaryUpload(args: ZoweBinaryUploadArgs): Promise<ZoweBinaryUploadResult> {
  const recordLength = fixedRecordLength(args.recordMetadata);
  if (!canAttemptZoweDirectBinaryUpload(args) || recordLength === undefined) {
    return { attempted: false, ok: false, reason: 'not-fixed-zowe-data-set' };
  }

  const resource = args.resource;
  const profile = getZoweProfile(resource);
  const dataSetName = resolveZoweDataSetName(args.uri, resource);
  const apiRegister = await getZoweApiRegister();
  const mvsApi = apiRegister?.getMvsApi?.(profile);

  args.log?.('provider.zoweDirectBinarySave.prepare', {
    bytes: args.bytes.length,
    recordFormat: args.recordMetadata?.recordFormat ?? null,
    lrecl: recordLength,
    hasResource: resource !== undefined,
    hasProfile: profile !== undefined,
    hasApiRegister: apiRegister !== undefined,
    hasMvsApi: mvsApi !== undefined,
    dataSetName: dataSetName ?? null,
  });

  if (!resource) {
    return { attempted: true, ok: false, reason: 'missing Zowe tree resource' };
  }
  if (!profile) {
    return { attempted: true, ok: false, reason: 'missing Zowe profile' };
  }
  if (!dataSetName) {
    return { attempted: true, ok: false, reason: 'could not resolve data set name' };
  }
  if (!mvsApi?.uploadFromBuffer) {
    return { attempted: true, ok: false, reason: 'Zowe MVS upload API is unavailable' };
  }

  try {
    const response = await mvsApi.uploadFromBuffer(Buffer.from(args.bytes), dataSetName, {
      binary: true,
      returnEtag: true,
      etag: getZoweEtag(resource),
    });
    setZoweEtag(resource, response);
    await vscode.workspace.fs.writeFile(args.uri.with({ query: setQueryParam(args.uri.query, 'inDiff', 'true') }), args.bytes);
    args.log?.('provider.zoweDirectBinarySave.writeSucceeded', {
      bytes: args.bytes.length,
      dataSetName,
      cacheQuery: setQueryParam(args.uri.query, 'inDiff', 'true'),
    });
    return { attempted: true, ok: true };
  } catch (error) {
    const reason = messageFromError(error);
    args.log?.('provider.zoweDirectBinarySave.writeFailed', {
      bytes: args.bytes.length,
      dataSetName,
      error: reason,
    });
    return { attempted: true, ok: false, reason };
  }
}

export function resolveZoweDataSetName(uri: vscode.Uri, resource: ZoweTreeResource | undefined): string | undefined {
  const fromResource = stringProperty(resource, 'metadata.dsName')
    ?? stringProperty(resource, 'dsName')
    ?? normalizeDataSetName(stringProperty(resource, 'fullPath'));
  if (fromResource) {
    return fromResource;
  }

  const label = cleanMemberName(stringProperty(resource, 'label'));
  const parentLabel = stringProperty(resource, 'mParent.label')
    ?? stringProperty(resource, 'parent.label')
    ?? stringProperty(resource, 'parentNode.label');
  if (label && parentLabel) {
    return `${parentLabel}(${label})`;
  }

  const segments = uri.path.split('/').filter(Boolean);
  if (segments.length >= 3) {
    const dataSet = segments[segments.length - 2];
    const member = cleanMemberName(segments[segments.length - 1]);
    return member ? `${dataSet}(${member})` : dataSet;
  }
  if (segments.length >= 2) {
    return segments[segments.length - 1];
  }

  return undefined;
}

async function getZoweApiRegister(): Promise<ZoweApiRegister | undefined> {
  const extension = vscode.extensions.getExtension('Zowe.vscode-extension-for-zowe')
    ?? vscode.extensions.getExtension('zowe.vscode-extension-for-zowe');
  if (!extension) {
    return undefined;
  }

  const exports = extension.isActive ? extension.exports : await extension.activate();
  return exports && typeof exports === 'object' ? exports as ZoweApiRegister : undefined;
}

function getZoweProfile(resource: ZoweTreeResource | undefined): unknown {
  return callMethod(resource, 'getProfile')
    ?? property(resource, 'profile')
    ?? property(resource, 'metadata.profile');
}

function getZoweEtag(resource: ZoweTreeResource): string | undefined {
  const etag = callMethod(resource, 'getEtag') ?? property(resource, 'etag');
  return typeof etag === 'string' && etag ? etag : undefined;
}

function setZoweEtag(resource: ZoweTreeResource, response: unknown): void {
  const etag = stringProperty(response, 'apiResponse.etag');
  if (!etag) {
    return;
  }

  const setEtag = property(resource, 'setEtag');
  if (typeof setEtag === 'function') {
    try {
      setEtag.call(resource, etag);
    } catch {
      // Best effort only; Zowe can refresh the entry later.
    }
  }
}

function normalizeDataSetName(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^[A-Z0-9#$@.\-]+(?:\([A-Z0-9#$@]{1,8}\))?$/i.test(trimmed)) {
    return trimmed;
  }

  const segments = trimmed.split(/[\\/]/).filter(Boolean);
  if (segments.length >= 2) {
    const dataSet = segments[segments.length - 2];
    const member = cleanMemberName(segments[segments.length - 1]);
    return member ? `${dataSet}(${member})` : dataSet;
  }

  return undefined;
}

function cleanMemberName(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const decoded = safeDecodeURIComponent(value.trim());
  const dot = decoded.indexOf('.');
  const member = (dot >= 0 ? decoded.slice(0, dot) : decoded).trim();
  return /^[A-Z0-9#$@]{1,8}$/i.test(member) ? member : undefined;
}

function setQueryParam(query: string, key: string, value: string): string {
  const params = new URLSearchParams(query);
  params.set(key, value);
  return params.toString();
}

function callMethod(source: unknown, path: string): unknown {
  const target = property(source, path);
  if (typeof target !== 'function') {
    return undefined;
  }

  try {
    return target.call(parentForPath(source, path));
  } catch {
    return undefined;
  }
}

function stringProperty(source: unknown, path: string): string | undefined {
  const value = property(source, path);
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function property(source: unknown, path: string): unknown {
  if (!source || typeof source !== 'object') {
    return undefined;
  }

  let current: unknown = source;
  for (const segment of path.split('.')) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function parentForPath(source: unknown, path: string): unknown {
  const segments = path.split('.');
  segments.pop();
  if (segments.length === 0) {
    return source;
  }
  return property(source, segments.join('.'));
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : typeof error === 'object' ? JSON.stringify(error) : String(error);
}
