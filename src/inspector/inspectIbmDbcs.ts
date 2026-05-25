import { decodeIbmDbcsPair, decodeIbmDbcsSbcsByte, type IbmDbcsCodePageProfile } from '../codec/ibmDbcs';
import { DEFAULT_DBCS_AMBIGUOUS_EXCLUSION_PAIRS, pairKey } from '../dbcsAmbiguousExclusions';

export type DiagnosticKind =
  | 'SO'
  | 'SI'
  | 'SBCS'
  | 'DBCS'
  | 'DBCS_AMBIGUOUS'
  | 'MISSING_SO'
  | 'MISSING_SI'
  | 'MISSING_SI_AT_EOF'
  | 'UNMATCHED_SO'
  | 'UNMATCHED_SI'
  | 'AMBIGUOUS'
  | 'INVALID_OR_UNKNOWN';

export interface DiagnosticEvent {
  kind: DiagnosticKind;
  /** 1-based byte ordinal of first byte */
  startOrdinal: number;
  /** 1-based byte ordinal of last byte */
  endOrdinal: number;
  /** 0-based byte offset in array */
  offset: number;
  length: number;
  bytesHex: string;
  decodedText: string;
  message: string;
}

export interface AnalysisResult {
  events: readonly DiagnosticEvent[];
  hasProblems: boolean;
  counts: Record<DiagnosticKind, number>;
}

export interface InspectIbmDbcsOptions {
  dbcsAmbiguousExclusions?: ReadonlySet<number>;
}

/**
 * Returns true if b is a strong indicator of an SBCS byte in EBCDIC DBCS code pages.
 */
function strongSbcsByte(profile: IbmDbcsCodePageProfile, b: number): boolean {
  if (b === profile.so || b === profile.si) return false;
  // Bytes below the DBCS pair range (0x40-0xFE) can never be DBCS bytes.
  // This covers all EBCDIC control characters including NL (0x15), LF (0x25), CR (0x0D).
  if (b < 0x40) return true;
  if (b === 0xFF) return true;
  if (isSbcsAlphanumeric(b)) return true;
  return isCommonSbcsSymbolByte(b);
}

function isSbcsAlphanumeric(b: number): boolean {
  return (
    (b >= 0xF0 && b <= 0xF9) ||
    (b >= 0xC1 && b <= 0xC9) ||
    (b >= 0xD1 && b <= 0xD9) ||
    (b >= 0xE2 && b <= 0xE9) ||
    (b >= 0x81 && b <= 0x89) ||
    (b >= 0x91 && b <= 0x99) ||
    (b >= 0xA2 && b <= 0xA9)
  );
}

function isSymbolicSbcsPair(data: Uint8Array, offset: number): boolean {
  return !isSbcsAlphanumeric(data[offset]) && !isSbcsAlphanumeric(data[offset + 1]);
}

function isSbcsLowercaseLetter(b: number): boolean {
  return (
    (b >= 0x81 && b <= 0x89) ||
    (b >= 0x91 && b <= 0x99) ||
    (b >= 0xA2 && b <= 0xA9)
  );
}

function isSbcsSymbolByte(b: number): boolean {
  return isCommonSbcsSymbolByte(b) && !isSbcsAlphanumeric(b);
}

function isCommonSbcsSymbolByte(b: number): boolean {
  switch (b) {
    case 0x40: // space
    case 0x4B: // .
    case 0x4D: // (
    case 0x6B: // ,
    case 0x5A: // !
    case 0x7A: // :
    case 0x4C: // <
    case 0x50: // &
    case 0x5C: // *
    case 0x5D: // )
    case 0x5B: // $
    case 0x60: // -
    case 0x61: // /
    case 0x6E: // >
    case 0x6F: // ?
    case 0x7C: // @
    case 0x7E: // =
    case 0x7F: // "
    case 0x7D: // '
    case 0xBA: // [
    case 0xBB: // ]
      return true;
    default:
      return false;
  }
}

function isExcludedDbcsAmbiguousPair(
  data: Uint8Array,
  offset: number,
  exclusions: ReadonlySet<number>,
): boolean {
  const b1 = data[offset];
  const b2 = data[offset + 1];
  return exclusions.has(pairKey(b1, b2));
}

function isPrivateUseCodePoint(cp: number): boolean {
  return (
    (cp >= 0xE000 && cp <= 0xF8FF) ||
    (cp >= 0xF0000 && cp <= 0xFFFFD) ||
    (cp >= 0x100000 && cp <= 0x10FFFD)
  );
}

function isNormalDbcsGlyph(glyph: string): boolean {
  const cp = glyph.codePointAt(0);
  return cp !== undefined && !isPrivateUseCodePoint(cp);
}

function isCjkUnifiedIdeograph(glyph: string): boolean {
  const cp = glyph.codePointAt(0);
  return cp !== undefined && (
    (cp >= 0x3400 && cp <= 0x4DBF) ||
    (cp >= 0x4E00 && cp <= 0x9FFF) ||
    (cp >= 0x20000 && cp <= 0x2A6DF) ||
    (cp >= 0x2A700 && cp <= 0x2B73F) ||
    (cp >= 0x2B740 && cp <= 0x2B81F) ||
    (cp >= 0x2B820 && cp <= 0x2CEAF) ||
    (cp >= 0x30000 && cp <= 0x3134F)
  );
}

function isCjkSymbolLowercaseAmbiguousPair(data: Uint8Array, offset: number, glyph: string): boolean {
  // IBM-937 has common ideographs such as "中" at byte pairs like 4C 84.
  // In SBCS mode those bytes render as "<d", so this catches missing SO/SI
  // cases without enabling every alphanumeric-looking DBCS candidate.
  return (
    isCjkUnifiedIdeograph(glyph) &&
    isSbcsSymbolByte(data[offset]) &&
    isSbcsLowercaseLetter(data[offset + 1])
  );
}

function toHex(data: Uint8Array, offset: number, length: number): string {
  const parts: string[] = [];
  for (let i = 0; i < length && offset + i < data.length; i++) {
    parts.push(data[offset + i].toString(16).toUpperCase().padStart(2, '0'));
  }
  return parts.join(' ');
}

function makeEvent(
  kind: DiagnosticKind,
  data: Uint8Array,
  offset: number,
  length: number,
  ordinal: number,
  decodedText: string,
  message: string,
): DiagnosticEvent {
  const endOrdinal = length <= 0 ? ordinal : ordinal + length - 1;
  return {
    kind,
    startOrdinal: ordinal,
    endOrdinal,
    offset,
    length,
    bytesHex: toHex(data, offset, length),
    decodedText,
    message,
  };
}

export function inspectIbmDbcs(
  profile: IbmDbcsCodePageProfile,
  data: Uint8Array,
  options: InspectIbmDbcsOptions = {},
): AnalysisResult {
  const events: DiagnosticEvent[] = [];
  const pendingAmbiguousEvents: DiagnosticEvent[] = [];
  const dbcsAmbiguousExclusions = options.dbcsAmbiguousExclusions ?? DEFAULT_DBCS_AMBIGUOUS_EXCLUSION_PAIRS;
  let dbcsMode = false;
  let i = 0;
  let ord = 1;

  const flushPendingAmbiguousEvents = () => {
    events.push(...pendingAmbiguousEvents);
    pendingAmbiguousEvents.length = 0;
  };

  const inferMissingSoFromPendingAmbiguousRun = (currentOffset: number, currentOrdinal: number, currentGlyph: string) => {
    const first = pendingAmbiguousEvents[0];
    if (first === undefined) {
      events.push(makeEvent('MISSING_SO', data, currentOffset, 2, currentOrdinal, currentGlyph,
        'Valid DBCS pair found in SBCS mode; inferred missing SO before this pair.'));
      return;
    }

    events.push(makeEvent('MISSING_SO', data, first.offset, first.length, first.startOrdinal, first.decodedText,
      'Valid DBCS run found in SBCS mode; inferred missing SO before this run.'));
    for (const pending of pendingAmbiguousEvents.slice(1)) {
      events.push(makeEvent('DBCS', data, pending.offset, pending.length, pending.startOrdinal, pending.decodedText, ''));
    }
    events.push(makeEvent('DBCS', data, currentOffset, 2, currentOrdinal, currentGlyph, ''));
    pendingAmbiguousEvents.length = 0;
  };

  while (i < data.length) {
    const b1 = data[i];

    if (b1 === profile.so) {
      flushPendingAmbiguousEvents();
      if (dbcsMode) {
        events.push(makeEvent('UNMATCHED_SO', data, i, 1, ord,
          'SO', 'SO found while already in DBCS mode; likely duplicate SO or missing SI before this SO.'));
      } else {
        events.push(makeEvent('SO', data, i, 1, ord, 'SO', 'Enter DBCS mode.'));
      }
      dbcsMode = true;
      i++; ord++;
      continue;
    }

    if (b1 === profile.si) {
      flushPendingAmbiguousEvents();
      if (!dbcsMode) {
        events.push(makeEvent('UNMATCHED_SI', data, i, 1, ord,
          'SI', 'SI found while already in SBCS mode; likely duplicate SI or missing SO before this SI.'));
      } else {
        events.push(makeEvent('SI', data, i, 1, ord, 'SI', 'Return to SBCS mode.'));
      }
      dbcsMode = false;
      i++; ord++;
      continue;
    }

    if (dbcsMode) {
      const glyph = i + 1 < data.length ? decodeIbmDbcsPair(profile, b1, data[i + 1]) : null;
      if (glyph !== null) {
        events.push(makeEvent('DBCS', data, i, 2, ord, glyph, ''));
        i += 2; ord += 2;
        continue;
      }

      if (strongSbcsByte(profile, b1)) {
        events.push(makeEvent('MISSING_SI', data, i, 1, ord,
          decodeIbmDbcsSbcsByte(profile, b1),
          'Strong SBCS byte found in DBCS mode; inferred missing SI before this byte.'));
        dbcsMode = false;
        i++; ord++;
        continue;
      }

      events.push(makeEvent('INVALID_OR_UNKNOWN', data, i, 1, ord,
        decodeIbmDbcsSbcsByte(profile, b1),
        'Not a valid DBCS pair and not a strong SBCS byte; leaving DBCS mode.'));
      dbcsMode = false;
      i++; ord++;
      continue;
    }

    // SBCS mode
    const glyph = i + 1 < data.length ? decodeIbmDbcsPair(profile, b1, data[i + 1]) : null;
    if (glyph !== null) {
      const pairLooksSbcs = strongSbcsByte(profile, b1) && strongSbcsByte(profile, data[i + 1]);
      if (
        pairLooksSbcs &&
        (isSymbolicSbcsPair(data, i) || isCjkSymbolLowercaseAmbiguousPair(data, i, glyph)) &&
        !isExcludedDbcsAmbiguousPair(data, i, dbcsAmbiguousExclusions) &&
        isNormalDbcsGlyph(glyph)
      ) {
        pendingAmbiguousEvents.push(makeEvent('DBCS_AMBIGUOUS', data, i, 2, ord, glyph,
          'Byte pair is valid DBCS, but the current SBCS mode also permits both bytes as SBCS characters.'));
        i += 2; ord += 2;
        continue;
      }

      if (pairLooksSbcs) {
        flushPendingAmbiguousEvents();
        events.push(makeEvent('SBCS', data, i, 1, ord, decodeIbmDbcsSbcsByte(profile, b1), ''));
        i++; ord++;
        continue;
      }

      inferMissingSoFromPendingAmbiguousRun(i, ord, glyph);
      dbcsMode = true;
      i += 2; ord += 2;
      continue;
    }

    if (strongSbcsByte(profile, b1) || i === data.length - 1) {
      flushPendingAmbiguousEvents();
      events.push(makeEvent('SBCS', data, i, 1, ord, decodeIbmDbcsSbcsByte(profile, b1), ''));
      i++; ord++;
      continue;
    }

    flushPendingAmbiguousEvents();
    events.push(makeEvent('INVALID_OR_UNKNOWN', data, i, 1, ord,
      decodeIbmDbcsSbcsByte(profile, b1),
      'Byte is neither a strong SBCS byte nor a valid DBCS pair start.'));
    i++; ord++;
  }

  flushPendingAmbiguousEvents();
  if (dbcsMode) {
    events.push({
      kind: 'MISSING_SI_AT_EOF',
      startOrdinal: ord,
      endOrdinal: ord,
      offset: data.length,
      length: 0,
      bytesHex: '',
      decodedText: '',
      message: `End of data reached while still in DBCS mode; likely missing SI (0x${profile.si.toString(16).toUpperCase().padStart(2, '0')}) at EOF.`,
    });
  }

  const counts: Record<DiagnosticKind, number> = {
    SO: 0, SI: 0, SBCS: 0, DBCS: 0, DBCS_AMBIGUOUS: 0,
    MISSING_SO: 0, MISSING_SI: 0, MISSING_SI_AT_EOF: 0,
    UNMATCHED_SO: 0, UNMATCHED_SI: 0,
    AMBIGUOUS: 0, INVALID_OR_UNKNOWN: 0,
  };
  for (const e of events) counts[e.kind]++;

  const hasProblems = (
    counts.MISSING_SO > 0 ||
    counts.MISSING_SI > 0 ||
    counts.MISSING_SI_AT_EOF > 0 ||
    counts.UNMATCHED_SO > 0 ||
    counts.UNMATCHED_SI > 0 ||
    counts.INVALID_OR_UNKNOWN > 0
  );

  return { events, hasProblems, counts };
}

export const PROBLEM_KINDS = new Set<DiagnosticKind>([
  'MISSING_SO', 'MISSING_SI', 'MISSING_SI_AT_EOF', 'UNMATCHED_SO', 'UNMATCHED_SI', 'INVALID_OR_UNKNOWN',
]);
export const WARNING_KINDS = new Set<DiagnosticKind>(['AMBIGUOUS', 'DBCS_AMBIGUOUS']);
