import {
  DEFAULT_SI,
  DEFAULT_SO,
  decodeIbmDbcsBytes,
  decodeIbmDbcsPair,
  decodeIbmDbcsSbcsByte,
  encodeIbmDbcsText,
  isValidIbmDbcsPair,
  type IbmDbcsCodePageProfile,
} from './ibmDbcs';
import { SBCS_TO_UNICODE, UNICODE_TO_SBCS, DBCS_TO_UNICODE, UNICODE_TO_DBCS } from './tables';

export const IBM937_PROFILE: IbmDbcsCodePageProfile = {
  id: 'ibm937',
  label: 'IBM-937',
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

export const SO = IBM937_PROFILE.so;
export const SI = IBM937_PROFILE.si;

/** Encode a UTF-8 string to IBM-937 bytes (with SO/SI for DBCS runs). */
export function encodeToIbm937(text: string): Uint8Array {
  return encodeIbmDbcsText(IBM937_PROFILE, text);
}

/** Decode IBM-937 bytes to a UTF-8 string. */
export function decodeFromIbm937(bytes: Uint8Array): string {
  return decodeIbmDbcsBytes(IBM937_PROFILE, bytes);
}

/** Check whether a (b1, b2) pair is a valid IBM-937 DBCS pair. */
export function isValidDbcsPair(b1: number, b2: number): boolean {
  return isValidIbmDbcsPair(IBM937_PROFILE, b1, b2);
}

/** Decode a single DBCS pair to its Unicode character, or null if invalid. */
export function decodeDbcsPair(b1: number, b2: number): string | null {
  return decodeIbmDbcsPair(IBM937_PROFILE, b1, b2);
}

/** Decode a single SBCS byte to its Unicode character. */
export function decodeSbcsByte(b: number): string {
  return decodeIbmDbcsSbcsByte(IBM937_PROFILE, b);
}
