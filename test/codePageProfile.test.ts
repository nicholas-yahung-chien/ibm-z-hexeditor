import { describe, expect, it } from 'vitest';
import { getIbmDbcsProfile, getIbmDbcsProfiles, isIbmDbcsEncoding, normalizeIbmDbcsEncoding } from '../src/codePages';
import { IBM930_PROFILE } from '../src/codec/ibm930';
import { IBM933_PROFILE } from '../src/codec/ibm933';
import { IBM935_PROFILE } from '../src/codec/ibm935';
import { IBM937_PROFILE, SI, SO } from '../src/codec/ibm937';
import { IBM939_PROFILE } from '../src/codec/ibm939';
import { IBM1364_PROFILE } from '../src/codec/ibm1364';
import { IBM1371_PROFILE } from '../src/codec/ibm1371';
import { IBM1388_PROFILE } from '../src/codec/ibm1388';
import { IBM1390_PROFILE } from '../src/codec/ibm1390';
import { IBM1399_PROFILE } from '../src/codec/ibm1399';
import { inspectIbmDbcs } from '../src/inspector/inspectIbmDbcs';
import { inspectIbm937 } from '../src/inspector/inspect937';

describe('IBM DBCS code page profiles', () => {
  it('registers IBM-937 as the current DBCS profile', () => {
    expect(getIbmDbcsProfile('ibm937')).toBe(IBM937_PROFILE);
    expect(getIbmDbcsProfile('IBM937')).toBe(IBM937_PROFILE);
    expect(isIbmDbcsEncoding('ibm937')).toBe(true);
    expect(isIbmDbcsEncoding('utf8')).toBe(false);
  });

  it('registers generated IBM DBCS profiles', () => {
    expect(getIbmDbcsProfiles().map(profile => profile.id)).toEqual([
      'ibm930',
      'ibm933',
      'ibm935',
      'ibm937',
      'ibm939',
      'ibm1364',
      'ibm1371',
      'ibm1388',
      'ibm1390',
      'ibm1399',
    ]);
    expect(getIbmDbcsProfile('ibm930')).toBe(IBM930_PROFILE);
    expect(getIbmDbcsProfile('IBM-930')).toBe(IBM930_PROFILE);
    expect(getIbmDbcsProfile('ibm933')).toBe(IBM933_PROFILE);
    expect(getIbmDbcsProfile('cp935')).toBe(IBM935_PROFILE);
    expect(getIbmDbcsProfile('ibm939')).toBe(IBM939_PROFILE);
    expect(getIbmDbcsProfile('IBM-1364')).toBe(IBM1364_PROFILE);
    expect(getIbmDbcsProfile('cp1371')).toBe(IBM1371_PROFILE);
    expect(getIbmDbcsProfile('ibm1388')).toBe(IBM1388_PROFILE);
    expect(getIbmDbcsProfile('IBM-1390')).toBe(IBM1390_PROFILE);
    expect(getIbmDbcsProfile('cp1399')).toBe(IBM1399_PROFILE);
    expect(normalizeIbmDbcsEncoding('IBM-930')).toBe('ibm930');
    expect(normalizeIbmDbcsEncoding('IBM-933')).toBe('ibm933');
    expect(normalizeIbmDbcsEncoding('CP-935')).toBe('ibm935');
    expect(normalizeIbmDbcsEncoding('cp939')).toBe('ibm939');
    expect(normalizeIbmDbcsEncoding('IBM-1364')).toBe('ibm1364');
    expect(normalizeIbmDbcsEncoding('cp1399')).toBe('ibm1399');
  });

  it('keeps the IBM-937 wrapper equivalent to the generic IBM DBCS inspector', () => {
    const bytes = Uint8Array.from([SO, 0x5a, 0x61, 0x5d, 0x7c, SI]);

    expect(inspectIbm937(bytes)).toEqual(inspectIbmDbcs(IBM937_PROFILE, bytes));
  });
});
