import { IBM930_PROFILE } from './codec/ibm930';
import { IBM937_PROFILE } from './codec/ibm937';
import { IBM939_PROFILE } from './codec/ibm939';
import type { IbmDbcsCodePageProfile } from './codec/ibmDbcs';

const IBM_DBCS_PROFILES: Record<string, IbmDbcsCodePageProfile> = {
  [IBM930_PROFILE.id]: IBM930_PROFILE,
  [IBM937_PROFILE.id]: IBM937_PROFILE,
  [IBM939_PROFILE.id]: IBM939_PROFILE,
};

export function getIbmDbcsProfile(encoding: string): IbmDbcsCodePageProfile | undefined {
  return IBM_DBCS_PROFILES[normalizeIbmDbcsEncoding(encoding)];
}

export function getIbmDbcsProfiles(): IbmDbcsCodePageProfile[] {
  return [IBM930_PROFILE, IBM937_PROFILE, IBM939_PROFILE];
}

export function isIbmDbcsEncoding(encoding: string): boolean {
  return getIbmDbcsProfile(encoding) !== undefined;
}

export function normalizeIbmDbcsEncoding(encoding: string): string {
  const lower = encoding.toLowerCase();
  const match = lower.match(/^(?:ibm|cp)-?(930|937|939)$/);
  return match ? `ibm${match[1]}` : lower;
}
