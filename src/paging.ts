import { buildLines } from './byteModel';
import type { RecordLine, RenderMode } from './protocol';

export const PAGE_LINE_COUNT = 30;
export const NO_NEWLINE_DISPLAY_LINE_BYTES = 100;
export const PAGE_BYTE_COUNT = PAGE_LINE_COUNT * NO_NEWLINE_DISPLAY_LINE_BYTES;

export interface PageRange {
  mode: RenderMode;
  pageIndex: number;
  pageCount: number;
  pageStartOffset: number;
  pageEndOffset: number;
  totalBytes: number;
  totalLines: number;
  pageLineStart: number;
  pageLineCount: number;
  forceLineBytes?: number;
}

export function buildPageRanges(
  bytes: Uint8Array,
  encoding: string,
  pageLineLimit = PAGE_LINE_COUNT,
): PageRange[] {
  const normalizedPageLineLimit = normalizePageLineLimit(pageLineLimit);
  if (bytes.length === 0) {
    return [singleRange(0, 0, 1, 0, 0, 0, 0, 1)];
  }

  const lines = buildLines(bytes, encoding);
  if (lines.length <= 1) {
    return buildBytePageRanges(bytes.length, normalizedPageLineLimit);
  }

  const pageCount = Math.ceil(lines.length / normalizedPageLineLimit);
  const ranges: PageRange[] = [];
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const firstLineIndex = pageIndex * normalizedPageLineLimit;
    const pageLines = lines.slice(firstLineIndex, firstLineIndex + normalizedPageLineLimit);
    const firstLine = pageLines[0];
    const lastLine = pageLines[pageLines.length - 1];
    const pageStartOffset = firstLine.startOffset;
    const pageEndOffset = lastLine.startOffset + lastLine.length;
    ranges.push(singleRange(
      pageIndex,
      pageCount,
      bytes.length,
      lines.length,
      pageStartOffset,
      pageEndOffset,
      firstLineIndex,
      pageLines.length,
    ));
  }
  return ranges;
}

export function buildDisplayLinesForPage(
  pageBytes: Uint8Array,
  encoding: string,
  range: PageRange,
): RecordLine[] {
  if (range.forceLineBytes === undefined) {
    return buildLines(pageBytes, encoding).map((line, index) => ({
      ...line,
      lineIndex: range.pageLineStart + index,
      startOffset: range.pageStartOffset + line.startOffset,
    }));
  }

  if (pageBytes.length === 0) {
    return [{ lineIndex: range.pageLineStart, startOffset: range.pageStartOffset, length: 0 }];
  }

  const lines: RecordLine[] = [];
  for (let offset = 0; offset < pageBytes.length; offset += range.forceLineBytes) {
    lines.push({
      lineIndex: range.pageLineStart + lines.length,
      startOffset: range.pageStartOffset + offset,
      length: Math.min(range.forceLineBytes, pageBytes.length - offset),
    });
  }
  return lines;
}

function buildBytePageRanges(totalBytes: number, pageLineLimit: number): PageRange[] {
  const pageByteCount = pageLineLimit * NO_NEWLINE_DISPLAY_LINE_BYTES;
  const pageCount = Math.max(1, Math.ceil(totalBytes / pageByteCount));
  const ranges: PageRange[] = [];
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const pageStartOffset = pageIndex * pageByteCount;
    const pageEndOffset = Math.min(totalBytes, pageStartOffset + pageByteCount);
    ranges.push({
      ...singleRange(
        pageIndex,
        pageCount,
        totalBytes,
        Math.max(1, Math.ceil(totalBytes / NO_NEWLINE_DISPLAY_LINE_BYTES)),
        pageStartOffset,
        pageEndOffset,
        pageIndex * pageLineLimit,
        Math.max(1, Math.ceil((pageEndOffset - pageStartOffset) / NO_NEWLINE_DISPLAY_LINE_BYTES)),
      ),
      forceLineBytes: NO_NEWLINE_DISPLAY_LINE_BYTES,
    });
  }
  return ranges;
}

function singleRange(
  pageIndex: number,
  pageCount: number,
  totalBytes: number,
  totalLines: number,
  pageStartOffset: number,
  pageEndOffset: number,
  pageLineStart: number,
  pageLineCount: number,
): PageRange {
  return {
    mode: 'paged',
    pageIndex,
    pageCount,
    pageStartOffset,
    pageEndOffset,
    totalBytes,
    totalLines,
    pageLineStart,
    pageLineCount,
  };
}

export function normalizePageLineLimit(value: number): number {
  return [30, 50, 100].includes(value) ? value : PAGE_LINE_COUNT;
}
