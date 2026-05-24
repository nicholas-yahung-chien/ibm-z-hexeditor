import {
  DEFAULT_SI,
  DEFAULT_SO,
  decodeIbmDbcsBytes,
  encodeIbmDbcsText,
  type IbmDbcsCodePageProfile,
} from './ibmDbcs';
import { SBCS_TO_UNICODE, UNICODE_TO_SBCS, DBCS_TO_UNICODE, UNICODE_TO_DBCS } from './generated/ibm1388Tables';

export const IBM1388_PROFILE: IbmDbcsCodePageProfile = {
  id: 'ibm1388',
  label: 'IBM-1388',
  so: DEFAULT_SO,
  si: DEFAULT_SI,
  sbcsToUnicode: SBCS_TO_UNICODE,
  unicodeToSbcs: UNICODE_TO_SBCS,
  dbcsToUnicode: DBCS_TO_UNICODE,
  unicodeToDbcs: UNICODE_TO_DBCS,
  newlineBytes: [0x15],
  replacementByte: 0x3F,
  replacementText: '?',
};

export function encodeToIbm1388(text: string): Uint8Array {
  return encodeIbmDbcsText(IBM1388_PROFILE, text);
}

export function decodeFromIbm1388(bytes: Uint8Array): string {
  return decodeIbmDbcsBytes(IBM1388_PROFILE, bytes);
}
