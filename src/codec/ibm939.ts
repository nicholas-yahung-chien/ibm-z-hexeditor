import {
  DEFAULT_SI,
  DEFAULT_SO,
  decodeIbmDbcsBytes,
  encodeIbmDbcsText,
  type IbmDbcsCodePageProfile,
} from './ibmDbcs';
import { SBCS_TO_UNICODE, UNICODE_TO_SBCS, DBCS_TO_UNICODE, UNICODE_TO_DBCS } from './generated/ibm939Tables';

export const IBM939_PROFILE: IbmDbcsCodePageProfile = {
  id: 'ibm939',
  label: 'IBM-939',
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

export function encodeToIbm939(text: string): Uint8Array {
  return encodeIbmDbcsText(IBM939_PROFILE, text);
}

export function decodeFromIbm939(bytes: Uint8Array): string {
  return decodeIbmDbcsBytes(IBM939_PROFILE, bytes);
}
