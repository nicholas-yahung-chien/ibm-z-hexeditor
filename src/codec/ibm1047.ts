import { decodeIbmSbcsBytes, encodeIbmSbcsText, type IbmSbcsCodePageProfile } from './ibmSbcs';
import { SBCS_TO_UNICODE, UNICODE_TO_SBCS } from './generated/ibm1047Tables';

export const IBM1047_PROFILE: IbmSbcsCodePageProfile = {
  id: 'ibm1047',
  label: 'IBM-1047',
  sbcsToUnicode: SBCS_TO_UNICODE,
  unicodeToSbcs: UNICODE_TO_SBCS,
  newlineBytes: [0x15],
  replacementByte: 0x3F,
  replacementText: '?',
};

export function encodeToIbm1047(text: string): Uint8Array {
  return encodeIbmSbcsText(IBM1047_PROFILE, text);
}

export function decodeFromIbm1047(bytes: Uint8Array): string {
  return decodeIbmSbcsBytes(IBM1047_PROFILE, bytes);
}
