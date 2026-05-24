import { decodeIbmSbcsBytes, encodeIbmSbcsText, type IbmSbcsCodePageProfile } from './ibmSbcs';
import { SBCS_TO_UNICODE, UNICODE_TO_SBCS } from './generated/ibm37Tables';

export const IBM37_PROFILE: IbmSbcsCodePageProfile = {
  id: 'ibm37',
  label: 'IBM-037',
  sbcsToUnicode: SBCS_TO_UNICODE,
  unicodeToSbcs: UNICODE_TO_SBCS,
  newlineBytes: [0x15],
  replacementByte: 0x3F,
  replacementText: '?',
};

export function encodeToIbm37(text: string): Uint8Array {
  return encodeIbmSbcsText(IBM37_PROFILE, text);
}

export function decodeFromIbm37(bytes: Uint8Array): string {
  return decodeIbmSbcsBytes(IBM37_PROFILE, bytes);
}
