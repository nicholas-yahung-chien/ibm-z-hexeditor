import type { AnalysisResult } from './inspector/inspect937';

export type HexNibble = 'high' | 'low';

export interface ByteCell {
  value: number;
  diagnostic?: string;
  lineStart?: boolean;
}

export interface RecordLine {
  lineIndex: number;
  startOffset: number;
  length: number;
  eol: string;
}

export interface EditorSnapshot {
  uri: string;
  fileName: string;
  sourceEncoding: string;
  hexEncoding: 'ibm937';
  cells: ByteCell[];
  lines: RecordLine[];
  diagnostics: AnalysisResult | null;
  dirty: boolean;
}

export type ToWebviewMessage =
  | { type: 'init'; snapshot: EditorSnapshot }
  | { type: 'snapshot'; snapshot: EditorSnapshot }
  | { type: 'saved'; snapshot: EditorSnapshot }
  | { type: 'error'; message: string };

export type FromWebviewMessage =
  | { type: 'ready' }
  | { type: 'replaceNibble'; offset: number; nibble: HexNibble; digit: number }
  | { type: 'save' };
