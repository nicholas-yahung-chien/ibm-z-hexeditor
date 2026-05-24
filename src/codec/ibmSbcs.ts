export interface IbmSbcsCodePageProfile {
  id: string;
  label: string;
  sbcsToUnicode: readonly number[];
  unicodeToSbcs: Record<number, number>;
  newlineBytes: readonly number[];
  replacementByte: number;
  replacementText: string;
}

export function encodeIbmSbcsText(profile: IbmSbcsCodePageProfile, text: string): Uint8Array {
  const out: number[] = [];

  for (const char of text) {
    const cp = char.codePointAt(0)!;
    out.push(profile.unicodeToSbcs[cp] ?? profile.replacementByte);
  }

  return new Uint8Array(out);
}

export function decodeIbmSbcsBytes(profile: IbmSbcsCodePageProfile, bytes: Uint8Array): string {
  return Array.from(bytes, byte => decodeIbmSbcsByte(profile, byte)).join('');
}

export function decodeIbmSbcsByte(profile: IbmSbcsCodePageProfile, byte: number): string {
  const cp = profile.sbcsToUnicode[byte];
  if (cp === undefined) {
    return profile.replacementText;
  }
  if (cp < 0x20 || (cp >= 0x7F && cp < 0xA0)) {
    return `[${cp.toString(16).toUpperCase().padStart(4, '0')}]`;
  }
  return String.fromCodePoint(cp);
}
