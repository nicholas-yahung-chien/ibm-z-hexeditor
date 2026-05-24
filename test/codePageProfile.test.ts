import { describe, expect, it } from 'vitest';
import { getIbmDbcsProfile, isIbmDbcsEncoding } from '../src/codePages';
import { IBM937_PROFILE, SI, SO } from '../src/codec/ibm937';
import { inspectIbmDbcs } from '../src/inspector/inspectIbmDbcs';
import { inspectIbm937 } from '../src/inspector/inspect937';

describe('IBM DBCS code page profiles', () => {
  it('registers IBM-937 as the current DBCS profile', () => {
    expect(getIbmDbcsProfile('ibm937')).toBe(IBM937_PROFILE);
    expect(getIbmDbcsProfile('IBM937')).toBe(IBM937_PROFILE);
    expect(isIbmDbcsEncoding('ibm937')).toBe(true);
    expect(isIbmDbcsEncoding('utf8')).toBe(false);
  });

  it('keeps the IBM-937 wrapper equivalent to the generic IBM DBCS inspector', () => {
    const bytes = Uint8Array.from([SO, 0x5a, 0x61, 0x5d, 0x7c, SI]);

    expect(inspectIbm937(bytes)).toEqual(inspectIbmDbcs(IBM937_PROFILE, bytes));
  });
});
