import * as vscode from 'vscode';
import { normalizeIbmCodePageEncoding } from './codePages';

export const COMMON_SOURCE_ENCODINGS = [
  'utf8',
  'utf8bom',
  'utf16le',
  'utf16be',
  'cp950',
  'big5hkscs',
  'shiftjis',
  'eucjp',
  'euckr',
  'gbk',
  'gb18030',
  'windows1252',
  'windows1250',
  'windows1251',
  'windows1253',
  'windows1254',
  'windows1255',
  'windows1256',
  'windows1257',
  'windows1258',
  'iso88591',
  'iso88592',
  'iso88595',
] as const;

const VS_CODE_TEXT_ENCODINGS = [
  ...COMMON_SOURCE_ENCODINGS,
  'cp437',
  'cp850',
  'cp852',
  'cp865',
  'cp866',
  'cp1125',
  'koi8r',
  'koi8u',
  'macroman',
  'iso88593',
  'iso88594',
  'iso88596',
  'iso88597',
  'iso88598',
  'iso88599',
  'iso885910',
  'iso885913',
  'iso885914',
  'iso885915',
  'iso885916',
] as const;

const KNOWN_VS_CODE_TEXT_ENCODINGS = new Set<string>(VS_CODE_TEXT_ENCODINGS);

export const PREFERRED_SOURCE_ENCODINGS = new Set(['utf8', 'utf8bom']);

export function normalizeEncoding(encoding: string | undefined): string {
  if (!encoding) {
    return 'utf8';
  }

  const lower = encoding.trim().toLowerCase();
  const compact = lower.replace(/[-_]/g, '');

  if (compact === 'utf8') {
    return 'utf8';
  }

  if (compact === 'big5') {
    return 'cp950';
  }

  return normalizeIbmCodePageEncoding(compact);
}

export function isKnownVsCodeTextEncoding(encoding: string): boolean {
  return KNOWN_VS_CODE_TEXT_ENCODINGS.has(normalizeEncoding(encoding));
}

export function getDocumentEncoding(document: vscode.TextDocument): string {
  return normalizeEncoding(document.encoding);
}

export async function decodeFileText(uri: vscode.Uri, encoding: string): Promise<string> {
  const bytes = await vscode.workspace.fs.readFile(uri);
  return vscode.workspace.decode(bytes, { encoding: normalizeEncoding(encoding) });
}

export async function encodeTextForFile(text: string, encoding: string, uri: vscode.Uri): Promise<Uint8Array> {
  return vscode.workspace.encode(text, { encoding: normalizeEncoding(encoding) });
}
