import { describe, expect, it } from 'vitest';
import { fixedRecordLength, inferFixedRecordMetadataFromZoweTrace, recordMetadataFromZoweStats } from '../src/recordMetadata';
import type { ZoweDatasetStatsTrace } from '../src/resourceSupport';

describe('record metadata', () => {
  it('normalizes Zowe dataset stats for fixed records', () => {
    const metadata = recordMetadataFromZoweStats({ recfm: 'fb', lrecl: '80', blksz: '3200' });

    expect(metadata).toEqual({
      source: 'zowe',
      recordFormat: 'FB',
      logicalRecordLength: 80,
      blockSize: 3200,
    });
    expect(fixedRecordLength(metadata)).toBe(80);
  });

  it('does not treat variable records as fixed-length records', () => {
    const metadata = recordMetadataFromZoweStats({ recfm: 'VB', lrecl: 84 });

    expect(metadata?.recordFormat).toBe('VB');
    expect(fixedRecordLength(metadata)).toBeUndefined();
  });

  it('ignores empty or invalid stats', () => {
    expect(recordMetadataFromZoweStats(undefined)).toBeUndefined();
    expect(recordMetadataFromZoweStats({ recfm: '', lrecl: 'not-a-number' })).toBeUndefined();
  });

  it('infers FB LRECL 80 for Zowe PDS members when stats are unavailable and byte count aligns', () => {
    const metadata = inferFixedRecordMetadataFromZoweTrace(new Uint8Array(160), {
      selectedSource: 'none',
      hasParent: true,
      resourceUriScheme: 'zowe-ds',
      resourceContextValue: 'memberBinary',
      parentContextValue: 'pds',
    });

    expect(metadata).toEqual({
      source: 'inferred',
      recordFormat: 'FB',
      logicalRecordLength: 80,
    });
    expect(fixedRecordLength(metadata)).toBe(80);
  });

  it('does not infer fixed records for non-PDS resources or unaligned byte counts', () => {
    const pdsMemberTrace: ZoweDatasetStatsTrace = {
      selectedSource: 'none',
      hasParent: true,
      resourceUriScheme: 'zowe-ds',
      resourceContextValue: 'memberBinary',
      parentContextValue: 'pds',
    };
    const ussTrace: ZoweDatasetStatsTrace = {
      ...pdsMemberTrace,
      resourceUriScheme: 'zowe-uss',
    };

    expect(inferFixedRecordMetadataFromZoweTrace(new Uint8Array(81), pdsMemberTrace)).toBeUndefined();
    expect(inferFixedRecordMetadataFromZoweTrace(new Uint8Array(160), ussTrace)).toBeUndefined();
  });
});
