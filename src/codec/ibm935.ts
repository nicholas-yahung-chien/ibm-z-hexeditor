import {
  DEFAULT_SI,
  DEFAULT_SO,
  decodeIbmDbcsBytes,
  encodeIbmDbcsText,
  type IbmDbcsCodePageProfile,
} from './ibmDbcs';
import { SBCS_TO_UNICODE, UNICODE_TO_SBCS, DBCS_TO_UNICODE, UNICODE_TO_DBCS } from './generated/ibm935Tables';

export const IBM935_PROFILE: IbmDbcsCodePageProfile = {
  id: 'ibm935',
  label: 'IBM-935',
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

export function encodeToIbm935(text: string): Uint8Array {
  return encodeIbmDbcsText(IBM935_PROFILE, text);
}

export function decodeFromIbm935(bytes: Uint8Array): string {
  return decodeIbmDbcsBytes(IBM935_PROFILE, bytes);
}
