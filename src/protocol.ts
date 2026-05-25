import type { AnalysisResult } from './inspector/inspectIbmDbcs';

export type HexNibble = 'high' | 'low';

export interface ByteCell {
  value: number;
  diagnostic?: string;
}

export interface RecordLine {
  lineIndex: number;
  startOffset: number;
  length: number;
  eol?: string;
}

export type PreviewKind = 'sbcs' | 'so' | 'si' | 'dbcs' | 'control' | 'invalid';

export interface PreviewEntry {
  byteOffset: number;
  byteLength: number;
  text: string;
  kind: PreviewKind;
}

export interface EditorSnapshot {
  uri: string;
  fileName: string;
  fileEncoding: string;
  cells: ByteCell[];
  lines: RecordLine[];
  preview: PreviewEntry[];
  diagnostics: AnalysisResult | null;
  dirty: boolean;
}

export interface EditorViewSettings {
  condenseMode: boolean;
  showRuler: boolean;
  locale: string;
}

export type ToWebviewMessage =
  | { type: 'init'; snapshot: EditorSnapshot }
  | { type: 'snapshot'; snapshot: EditorSnapshot }
  | { type: 'saved'; snapshot: EditorSnapshot }
  | { type: 'settings'; settings: EditorViewSettings }
  | { type: 'status'; message: string }
  | { type: 'error'; message: string };

export type FromWebviewMessage =
  | { type: 'ready' }
  | { type: 'replaceNibble'; offset: number; nibble: HexNibble; digit: number }
  | { type: 'insertByte'; offset: number; value?: number }
  | { type: 'deleteByte'; offset: number }
  | { type: 'revert' }
  | { type: 'reload' }
  | { type: 'save' };
