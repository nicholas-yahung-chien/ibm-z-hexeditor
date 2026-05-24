import { decodeIbmSbcsBytes, encodeIbmSbcsText, type IbmSbcsCodePageProfile } from './ibmSbcs';
import { SBCS_TO_UNICODE, UNICODE_TO_SBCS } from './generated/ibm1140Tables';

export const IBM1140_PROFILE: IbmSbcsCodePageProfile = {
  id: 'ibm1140',
  label: 'IBM-1140',
  sbcsToUnicode: SBCS_TO_UNICODE,
  unicodeToSbcs: UNICODE_TO_SBCS,
  newlineBytes: [0x15],
  replacementByte: 0x3F,
  replacementText: '?',
};

export function encodeToIbm1140(text: string): Uint8Array {
  return encodeIbmSbcsText(IBM1140_PROFILE, text);
}

export function decodeFromIbm1140(bytes: Uint8Array): string {
  return decodeIbmSbcsBytes(IBM1140_PROFILE, bytes);
}
