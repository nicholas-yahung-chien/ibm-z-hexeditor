import type { RecordMetadata } from './protocol';
import type { ZoweDatasetStats, ZoweDatasetStatsTrace } from './resourceSupport';

const COMMON_FIXED_SOURCE_RECORD_LENGTH = 80;

export function recordMetadataFromZoweStats(stats: ZoweDatasetStats | undefined): RecordMetadata | undefined {
  const recordFormat = normalizeRecordFormat(stats?.recfm);
  const logicalRecordLength = positiveInteger(stats?.lrecl);
  const blockSize = positiveInteger(stats?.blksz);

  if (!recordFormat && logicalRecordLength === undefined && blockSize === undefined) {
    return undefined;
  }

  return {
    source: 'zowe',
    recordFormat: recordFormat ?? '',
    logicalRecordLength,
    blockSize,
  };
}

export function inferFixedRecordMetadataFromZoweTrace(
  bytes: Uint8Array,
  trace: ZoweDatasetStatsTrace,
): RecordMetadata | undefined {
  if (trace.resourceUriScheme !== 'zowe-ds' || trace.selectedSource !== 'none') {
    return undefined;
  }

  if (!looksLikePdsMember(trace)) {
    return undefined;
  }

  if (bytes.length === 0 || bytes.length % COMMON_FIXED_SOURCE_RECORD_LENGTH !== 0) {
    return undefined;
  }

  return {
    source: 'inferred',
    recordFormat: 'FB',
    logicalRecordLength: COMMON_FIXED_SOURCE_RECORD_LENGTH,
  };
}

export function fixedRecordLength(metadata: RecordMetadata | undefined): number | undefined {
  if (!metadata?.recordFormat || metadata.logicalRecordLength === undefined) {
    return undefined;
  }

  const format = metadata.recordFormat.toUpperCase();
  return format.startsWith('F') ? metadata.logicalRecordLength : undefined;
}

function normalizeRecordFormat(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  return normalized || undefined;
}

function looksLikePdsMember(trace: ZoweDatasetStatsTrace): boolean {
  const resourceContext = String(trace.resourceContextValue ?? '').toLowerCase();
  const parentContext = String(trace.parentContextValue ?? '').toLowerCase();
  return resourceContext.includes('member') && parentContext.includes('pds');
}

function positiveInteger(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
}
