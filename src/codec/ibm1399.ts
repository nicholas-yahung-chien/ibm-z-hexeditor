import {
  DEFAULT_SI,
  DEFAULT_SO,
  decodeIbmDbcsBytes,
  encodeIbmDbcsText,
  type IbmDbcsCodePageProfile,
} from './ibmDbcs';
import { SBCS_TO_UNICODE, UNICODE_TO_SBCS, DBCS_TO_UNICODE, UNICODE_TO_DBCS } from './generated/ibm1399Tables';

export const IBM1399_PROFILE: IbmDbcsCodePageProfile = {
  id: 'ibm1399',
  label: 'IBM-1399',
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

export function encodeToIbm1399(text: string): Uint8Array {
  return encodeIbmDbcsText(IBM1399_PROFILE, text);
}

export function decodeFromIbm1399(bytes: Uint8Array): string {
  return decodeIbmDbcsBytes(IBM1399_PROFILE, bytes);
}
