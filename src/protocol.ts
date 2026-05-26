import type { AnalysisResult } from './inspector/inspectIbmDbcs';

export type HexNibble = 'high' | 'low';
export type RenderMode = 'full' | 'paged';

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

export interface PageInfo {
  mode: RenderMode;
  pageIndex: number;
  pageCount: number;
  pageStartOffset: number;
  pageEndOffset: number;
  totalBytes: number;
  totalLines: number;
  pageLineStart: number;
  pageLineCount: number;
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
  page?: PageInfo;
}

export interface EditorViewSettings {
  condenseMode: boolean;
  showRuler: boolean;
  renderMode: RenderMode;
  pageLineLimit: number;
  performanceLogging: boolean;
  locale: string;
}

export interface PerformanceMessageMarker {
  phase: string;
  sentEpochMs: number;
}

export type PerformanceLogFields = Record<string, string | number | boolean | null>;

export type ToWebviewMessage =
  ({
    perf?: PerformanceMessageMarker;
  } & (
    | { type: 'init'; snapshot: EditorSnapshot }
    | { type: 'snapshot'; snapshot: EditorSnapshot }
    | { type: 'saved'; snapshot: EditorSnapshot }
    | { type: 'settings'; settings: EditorViewSettings }
    | { type: 'status'; message: string }
    | { type: 'error'; message: string }
  ));

export type FromWebviewMessage =
  | { type: 'ready' }
  | { type: 'performanceLog'; phase: string; fields: PerformanceLogFields }
  | { type: 'replaceNibble'; offset: number; nibble: HexNibble; digit: number }
  | { type: 'insertByte'; offset: number; value?: number }
  | { type: 'deleteByte'; offset: number }
  | { type: 'goToPage'; pageIndex: number }
  | { type: 'revert' }
  | { type: 'reload' }
  | { type: 'save' };
