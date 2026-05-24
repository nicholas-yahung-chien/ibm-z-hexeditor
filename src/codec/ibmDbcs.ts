export const DEFAULT_SO = 0x0E;
export const DEFAULT_SI = 0x0F;

export interface IbmDbcsCodePageProfile {
  id: string;
  label: string;
  so: number;
  si: number;
  sbcsToUnicode: Record<number, number>;
  unicodeToSbcs: Record<number, number>;
  dbcsToUnicode: Record<number, number>;
  unicodeToDbcs: Record<number, number>;
  newlineBytes: readonly number[];
  replacementByte: number;
  replacementText: string;
}

export function encodeIbmDbcsText(profile: IbmDbcsCodePageProfile, text: string): Uint8Array {
  const out: number[] = [];
  let inDbcs = false;

  for (const char of text) {
    const cp = char.codePointAt(0)!;

    const dbcsPair = profile.unicodeToDbcs[cp];
    if (dbcsPair !== undefined) {
      if (!inDbcs) {
        out.push(profile.so);
        inDbcs = true;
      }
      out.push((dbcsPair >> 8) & 0xFF, dbcsPair & 0xFF);
      continue;
    }

    const sbcsByte = profile.unicodeToSbcs[cp];
    if (sbcsByte !== undefined) {
      if (inDbcs) {
        out.push(profile.si);
        inDbcs = false;
      }
      out.push(sbcsByte);
      continue;
    }

    if (inDbcs) {
      out.push(profile.si);
      inDbcs = false;
    }
    out.push(profile.replacementByte);
  }

  if (inDbcs) {
    out.push(profile.si);
  }

  return new Uint8Array(out);
}

export function decodeIbmDbcsBytes(profile: IbmDbcsCodePageProfile, bytes: Uint8Array): string {
  let result = '';
  let i = 0;
  let inDbcs = false;

  while (i < bytes.length) {
    const b = bytes[i];

    if (b === profile.so) {
      inDbcs = true;
      i++;
      continue;
    }
    if (b === profile.si) {
      inDbcs = false;
      i++;
      continue;
    }

    if (inDbcs) {
      if (i + 1 < bytes.length) {
        result += decodeIbmDbcsPair(profile, b, bytes[i + 1]) ?? profile.replacementText;
        i += 2;
      } else {
        result += profile.replacementText;
        i++;
      }
      continue;
    }

    result += decodeIbmDbcsSbcsByte(profile, b);
    i++;
  }

  return result;
}

export function isValidIbmDbcsPair(profile: IbmDbcsCodePageProfile, b1: number, b2: number): boolean {
  const key = (b1 << 8) | b2;
  return profile.dbcsToUnicode[key] !== undefined;
}

export function decodeIbmDbcsPair(profile: IbmDbcsCodePageProfile, b1: number, b2: number): string | null {
  const key = (b1 << 8) | b2;
  const cp = profile.dbcsToUnicode[key];
  return cp !== undefined ? String.fromCodePoint(cp) : null;
}

export function decodeIbmDbcsSbcsByte(profile: IbmDbcsCodePageProfile, b: number): string {
  const cp = profile.sbcsToUnicode[b];
  if (cp === undefined) {
    return profile.replacementText;
  }
  if (cp < 0x20 || (cp >= 0x7F && cp < 0xA0)) {
    return `[${cp.toString(16).toUpperCase().padStart(4, '0')}]`;
  }
  return String.fromCodePoint(cp);
}
