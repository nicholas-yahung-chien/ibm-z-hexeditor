import * as vscode from 'vscode';
import { normalizeIbmDbcsEncoding } from './codePages';

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

export const PREFERRED_SOURCE_ENCODINGS = new Set(['utf8', 'utf8bom']);

export function normalizeEncoding(encoding: string | undefined): string {
  if (!encoding) {
    return 'utf8';
  }

  const lower = encoding.toLowerCase();
  if (lower === 'utf-8') {
    return 'utf8';
  }
  return normalizeIbmDbcsEncoding(lower);
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
