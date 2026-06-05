import { getIbmDbcsProfile, getIbmSbcsProfile } from './codePages';
import { decodeIbmDbcsBytes, encodeIbmDbcsText } from './codec/ibmDbcs';
import { decodeIbmSbcsBytes, encodeIbmSbcsText } from './codec/ibmSbcs';
import type { RecordMetadata } from './protocol';
import { fixedRecordLength } from './recordMetadata';

export type RoundTripResult =
  | { ok: true; text: string; encoded: Uint8Array }
  | { ok: false; reason: 'unsupported-encoding' | 'fixed-record-unsupported' | 'mismatch'; mismatchOffset?: number };

export function roundTripTextConversion(bytes: Uint8Array, encoding: string, recordMetadata?: RecordMetadata): RoundTripResult {
  const recordLength = fixedRecordLength(recordMetadata);
  if (recordLength !== undefined) {
    return { ok: false, reason: 'fixed-record-unsupported' };
  }

  return roundTripSingleText(bytes, encoding);
}

function roundTripSingleText(bytes: Uint8Array, encoding: string): RoundTripResult {
  const dbcsProfile = getIbmDbcsProfile(encoding);
  if (dbcsProfile) {
    const text = decodeIbmDbcsBytes(dbcsProfile, bytes);
    const encoded = encodeIbmDbcsText(dbcsProfile, text);
    return compareRoundTrip(bytes, text, encoded);
  }

  const sbcsProfile = getIbmSbcsProfile(encoding);
  if (sbcsProfile) {
    const text = decodeIbmSbcsBytes(sbcsProfile, bytes);
    const encoded = encodeIbmSbcsText(sbcsProfile, text);
    return compareRoundTrip(bytes, text, encoded);
  }

  return { ok: false, reason: 'unsupported-encoding' };
}

function compareRoundTrip(original: Uint8Array, text: string, encoded: Uint8Array): RoundTripResult {
  const mismatchOffset = firstMismatchOffset(original, encoded);
  if (mismatchOffset !== undefined) {
    return { ok: false, reason: 'mismatch', mismatchOffset };
  }
  return { ok: true, text, encoded };
}

function firstMismatchOffset(left: Uint8Array, right: Uint8Array): number | undefined {
  const length = Math.min(left.length, right.length);
  for (let i = 0; i < length; i++) {
    if (left[i] !== right[i]) {
      return i;
    }
  }
  return left.length === right.length ? undefined : length;
}
