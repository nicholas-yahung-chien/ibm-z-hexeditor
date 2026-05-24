import { IBM930_PROFILE } from './codec/ibm930';
import { IBM933_PROFILE } from './codec/ibm933';
import { IBM935_PROFILE } from './codec/ibm935';
import { IBM937_PROFILE } from './codec/ibm937';
import { IBM939_PROFILE } from './codec/ibm939';
import { IBM1364_PROFILE } from './codec/ibm1364';
import { IBM1371_PROFILE } from './codec/ibm1371';
import { IBM1388_PROFILE } from './codec/ibm1388';
import { IBM1390_PROFILE } from './codec/ibm1390';
import { IBM1399_PROFILE } from './codec/ibm1399';
import { IBM37_PROFILE } from './codec/ibm37';
import { IBM500_PROFILE } from './codec/ibm500';
import { IBM1047_PROFILE } from './codec/ibm1047';
import { IBM1140_PROFILE } from './codec/ibm1140';
import type { IbmDbcsCodePageProfile } from './codec/ibmDbcs';
import type { IbmSbcsCodePageProfile } from './codec/ibmSbcs';

const IBM_DBCS_PROFILES: Record<string, IbmDbcsCodePageProfile> = {
  [IBM930_PROFILE.id]: IBM930_PROFILE,
  [IBM933_PROFILE.id]: IBM933_PROFILE,
  [IBM935_PROFILE.id]: IBM935_PROFILE,
  [IBM937_PROFILE.id]: IBM937_PROFILE,
  [IBM939_PROFILE.id]: IBM939_PROFILE,
  [IBM1364_PROFILE.id]: IBM1364_PROFILE,
  [IBM1371_PROFILE.id]: IBM1371_PROFILE,
  [IBM1388_PROFILE.id]: IBM1388_PROFILE,
  [IBM1390_PROFILE.id]: IBM1390_PROFILE,
  [IBM1399_PROFILE.id]: IBM1399_PROFILE,
};

const IBM_SBCS_PROFILES: Record<string, IbmSbcsCodePageProfile> = {
  [IBM37_PROFILE.id]: IBM37_PROFILE,
  [IBM500_PROFILE.id]: IBM500_PROFILE,
  [IBM1047_PROFILE.id]: IBM1047_PROFILE,
  [IBM1140_PROFILE.id]: IBM1140_PROFILE,
};

export function getIbmDbcsProfile(encoding: string): IbmDbcsCodePageProfile | undefined {
  return IBM_DBCS_PROFILES[normalizeIbmDbcsEncoding(encoding)];
}

export function getIbmDbcsProfiles(): IbmDbcsCodePageProfile[] {
  return [
    IBM930_PROFILE,
    IBM933_PROFILE,
    IBM935_PROFILE,
    IBM937_PROFILE,
    IBM939_PROFILE,
    IBM1364_PROFILE,
    IBM1371_PROFILE,
    IBM1388_PROFILE,
    IBM1390_PROFILE,
    IBM1399_PROFILE,
  ];
}

export function isIbmDbcsEncoding(encoding: string): boolean {
  return getIbmDbcsProfile(encoding) !== undefined;
}

export function getIbmSbcsProfile(encoding: string): IbmSbcsCodePageProfile | undefined {
  return IBM_SBCS_PROFILES[normalizeIbmCodePageEncoding(encoding)];
}

export function getIbmSbcsProfiles(): IbmSbcsCodePageProfile[] {
  return [
    IBM37_PROFILE,
    IBM500_PROFILE,
    IBM1047_PROFILE,
    IBM1140_PROFILE,
  ];
}

export function isIbmSbcsEncoding(encoding: string): boolean {
  return getIbmSbcsProfile(encoding) !== undefined;
}

export function isSupportedIbmCodePageEncoding(encoding: string): boolean {
  return isIbmDbcsEncoding(encoding) || isIbmSbcsEncoding(encoding);
}

export function normalizeIbmCodePageEncoding(encoding: string): string {
  const lower = encoding.toLowerCase();
  const dbcsMatch = lower.match(/^(?:ibm|cp)-?(930|933|935|937|939|1364|1371|1388|1390|1399)$/);
  if (dbcsMatch) {
    return `ibm${dbcsMatch[1]}`;
  }

  const sbcsMatch = lower.match(/^(?:ibm|cp)-?(0?37|500|1047|1140)$/);
  if (sbcsMatch) {
    return `ibm${Number.parseInt(sbcsMatch[1], 10)}`;
  }

  return lower;
}

export function normalizeIbmDbcsEncoding(encoding: string): string {
  const normalized = normalizeIbmCodePageEncoding(encoding);
  return IBM_DBCS_PROFILES[normalized] ? normalized : encoding.toLowerCase();
}
