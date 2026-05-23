import * as vscode from 'vscode';

export const SUPPORTED_SOURCE_ENCODINGS = new Set(['utf8', 'utf-8']);

export function normalizeEncoding(encoding: string | undefined): string {
  if (!encoding) {
    return 'utf8';
  }

  const lower = encoding.toLowerCase();
  return lower === 'utf-8' ? 'utf8' : lower;
}

export function getDocumentEncoding(document: vscode.TextDocument): string {
  const maybeDocument = document as vscode.TextDocument & { encoding?: string };
  return normalizeEncoding(maybeDocument.encoding);
}

export async function encodeTextForFile(text: string, encoding: string, uri: vscode.Uri): Promise<Uint8Array> {
  const workspaceWithEncoding = vscode.workspace as typeof vscode.workspace & {
    encode?: (content: string, options: { encoding: string } | { uri: vscode.Uri }) => Thenable<Uint8Array>;
  };

  if (workspaceWithEncoding.encode) {
    return workspaceWithEncoding.encode(text, { encoding });
  }

  if (normalizeEncoding(encoding) !== 'utf8') {
    throw new Error(`VS Code encoding API is unavailable, cannot write ${encoding} for ${uri.fsPath}.`);
  }

  return new TextEncoder().encode(text);
}
