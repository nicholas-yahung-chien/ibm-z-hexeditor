import { decodeIbmSbcsBytes, encodeIbmSbcsText, type IbmSbcsCodePageProfile } from './ibmSbcs';
import { SBCS_TO_UNICODE, UNICODE_TO_SBCS } from './generated/ibm500Tables';

export const IBM500_PROFILE: IbmSbcsCodePageProfile = {
  id: 'ibm500',
  label: 'IBM-500',
  sbcsToUnicode: SBCS_TO_UNICODE,
  unicodeToSbcs: UNICODE_TO_SBCS,
  newlineBytes: [0x15],
  replacementByte: 0x3F,
  replacementText: '?',
};

export function encodeToIbm500(text: string): Uint8Array {
  return encodeIbmSbcsText(IBM500_PROFILE, text);
}

export function decodeFromIbm500(bytes: Uint8Array): string {
  return decodeIbmSbcsBytes(IBM500_PROFILE, bytes);
}
