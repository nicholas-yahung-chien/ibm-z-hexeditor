import * as vscode from 'vscode';

export const SUPPORTED_RESOURCE_SCHEMES = new Set(['file', 'zowe-ds', 'zowe-uss']);
export const ZOWE_RESOURCE_SCHEMES = new Set(['zowe-ds', 'zowe-uss']);

export interface ZoweTreeResource {
  resourceUri: vscode.Uri;
  getEncoding?: () => unknown | Promise<unknown>;
  setEncoding?: (encoding: unknown) => void | Promise<void>;
  getParent?: () => unknown;
  getStats?: () => unknown;
  stats?: unknown;
}

export interface ZoweDatasetStats {
  recfm?: unknown;
  lrecl?: unknown;
  blksz?: unknown;
}

export interface ZoweDatasetStatsTrace {
  selectedSource: 'own' | 'parent' | 'none' | 'not-zowe-ds';
  selectedStats?: ZoweDatasetStats;
  ownStats?: ZoweDatasetStats;
  parentStats?: ZoweDatasetStats;
  hasParent: boolean;
  resourceLabel?: unknown;
  resourceContextValue?: unknown;
  parentLabel?: unknown;
  parentContextValue?: unknown;
  resourceUriScheme?: string;
}

export function isSupportedResourceUri(uri: vscode.Uri): boolean {
  return SUPPORTED_RESOURCE_SCHEMES.has(uri.scheme);
}

export function isZoweResourceUri(uri: vscode.Uri): boolean {
  return ZOWE_RESOURCE_SCHEMES.has(uri.scheme);
}

export function asZoweTreeResource(candidate: unknown): ZoweTreeResource | undefined {
  if (!candidate || typeof candidate !== 'object') {
    return undefined;
  }

  const resourceUri = asVsCodeUri((candidate as { resourceUri?: unknown }).resourceUri);
  if (resourceUri && isZoweResourceUri(resourceUri)) {
    (candidate as ZoweTreeResource).resourceUri = resourceUri;
    return candidate as ZoweTreeResource;
  }

  return undefined;
}

export function getZoweDatasetStats(resource: ZoweTreeResource | undefined): ZoweDatasetStats | undefined {
  return traceZoweDatasetStats(resource).selectedStats;
}

export function traceZoweDatasetStats(resource: ZoweTreeResource | undefined): ZoweDatasetStatsTrace {
  if (!resource || resource.resourceUri.scheme !== 'zowe-ds') {
    return {
      selectedSource: resource ? 'not-zowe-ds' : 'none',
      hasParent: false,
      resourceUriScheme: resource?.resourceUri.scheme,
      resourceLabel: resource ? (resource as { label?: unknown }).label : undefined,
      resourceContextValue: resource ? (resource as { contextValue?: unknown }).contextValue : undefined,
    };
  }

  const ownStats = readZoweStats(resource);
  if (hasRecordLayoutStats(ownStats)) {
    return {
      selectedSource: 'own',
      selectedStats: ownStats,
      ownStats,
      hasParent: false,
      resourceUriScheme: resource.resourceUri.scheme,
      resourceLabel: (resource as { label?: unknown }).label,
      resourceContextValue: (resource as { contextValue?: unknown }).contextValue,
    };
  }

  const parent = parentOfZoweResource(resource);
  const hasParent = parent !== undefined;
  const parentStats = readZoweStats(parent);
  if (hasRecordLayoutStats(parentStats)) {
    return {
      selectedSource: 'parent',
      selectedStats: { ...ownStats, ...parentStats },
      ownStats,
      parentStats,
      hasParent,
      resourceUriScheme: resource.resourceUri.scheme,
      resourceLabel: (resource as { label?: unknown }).label,
      resourceContextValue: (resource as { contextValue?: unknown }).contextValue,
      parentLabel: parent ? (parent as { label?: unknown }).label : undefined,
      parentContextValue: parent ? (parent as { contextValue?: unknown }).contextValue : undefined,
    };
  }

  return {
    selectedSource: ownStats ?? parentStats ? 'none' : 'none',
    selectedStats: ownStats ?? parentStats,
    ownStats,
    parentStats,
    hasParent,
    resourceUriScheme: resource.resourceUri.scheme,
    resourceLabel: (resource as { label?: unknown }).label,
    resourceContextValue: (resource as { contextValue?: unknown }).contextValue,
    parentLabel: parent ? (parent as { label?: unknown }).label : undefined,
    parentContextValue: parent ? (parent as { contextValue?: unknown }).contextValue : undefined,
  };
}

function readZoweStats(resource: ZoweTreeResource | undefined): ZoweDatasetStats | undefined {
  if (!resource) {
    return undefined;
  }

  const stats = safeCall(resource.getStats) ?? resource.stats;
  return isObject(stats) ? stats as ZoweDatasetStats : undefined;
}

function hasRecordLayoutStats(stats: ZoweDatasetStats | undefined): boolean {
  return stats?.recfm !== undefined && stats?.lrecl !== undefined;
}

function asZoweTreeResourceLike(candidate: unknown): ZoweTreeResource | undefined {
  return candidate && typeof candidate === 'object' ? candidate as ZoweTreeResource : undefined;
}

function parentOfZoweResource(resource: ZoweTreeResource): ZoweTreeResource | undefined {
  const byMethod = asZoweTreeResourceLike(safeCall(resource.getParent));
  if (byMethod) {
    return byMethod;
  }

  const candidate = resource as {
    mParent?: unknown;
    parent?: unknown;
    parentNode?: unknown;
  };
  return asZoweTreeResourceLike(candidate.mParent)
    ?? asZoweTreeResourceLike(candidate.parent)
    ?? asZoweTreeResourceLike(candidate.parentNode);
}

function safeCall<T>(fn: (() => T) | undefined): T | undefined {
  try {
    return fn?.();
  } catch {
    return undefined;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asVsCodeUri(value: unknown): vscode.Uri | undefined {
  if (value instanceof vscode.Uri) {
    return value;
  }
  if (!isObject(value) || typeof value.scheme !== 'string' || typeof value.path !== 'string') {
    return undefined;
  }

  return vscode.Uri.from({
    scheme: value.scheme,
    authority: typeof value.authority === 'string' ? value.authority : '',
    path: value.path,
    query: typeof value.query === 'string' ? value.query : '',
    fragment: typeof value.fragment === 'string' ? value.fragment : '',
  });
}
