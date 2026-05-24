import { IBM937_PROFILE } from './codec/ibm937';
import type { IbmDbcsCodePageProfile } from './codec/ibmDbcs';

const IBM_DBCS_PROFILES: Record<string, IbmDbcsCodePageProfile> = {
  [IBM937_PROFILE.id]: IBM937_PROFILE,
};

export function getIbmDbcsProfile(encoding: string): IbmDbcsCodePageProfile | undefined {
  return IBM_DBCS_PROFILES[encoding.toLowerCase()];
}

export function isIbmDbcsEncoding(encoding: string): boolean {
  return getIbmDbcsProfile(encoding) !== undefined;
}
