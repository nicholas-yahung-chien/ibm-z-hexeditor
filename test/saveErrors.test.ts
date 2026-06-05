import { describe, expect, it } from 'vitest';
import { isZoweDataSetUnsafeUploadError } from '../src/saveErrors';

describe('save error classification', () => {
  it('detects Zowe unsafe upload errors only for data set resources', () => {
    expect(isZoweDataSetUnsafeUploadError('zowe-ds', 'Zowe Explorer: Unsafe upload')).toBe(true);
    expect(isZoweDataSetUnsafeUploadError('zowe-ds', 'This upload operation may result in data loss.')).toBe(true);
    expect(isZoweDataSetUnsafeUploadError('zowe-ds', '此上傳作業可能會導致資料遺失。')).toBe(true);

    expect(isZoweDataSetUnsafeUploadError('zowe-uss', 'Zowe Explorer: Unsafe upload')).toBe(false);
    expect(isZoweDataSetUnsafeUploadError('file', 'This upload operation may result in data loss.')).toBe(false);
    expect(isZoweDataSetUnsafeUploadError('zowe-ds', 'Network error')).toBe(false);
  });
});
