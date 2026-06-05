import { describe, expect, it } from 'vitest';
import { buildDisplayLinesForPage, buildPageRanges, NO_NEWLINE_DISPLAY_LINE_BYTES, PAGE_BYTE_COUNT, PAGE_LINE_COUNT } from '../src/paging';

describe('paged render ranges', () => {
  it('groups explicit record lines into 30-line pages', () => {
    const bytes = Uint8Array.from(Array.from({ length: 65 }, () => 0x15));
    const ranges = buildPageRanges(bytes, 'ibm937');

    expect(ranges).toHaveLength(3);
    expect(ranges[0]).toMatchObject({
      pageIndex: 0,
      pageCount: 3,
      pageStartOffset: 0,
      pageEndOffset: PAGE_LINE_COUNT,
      pageLineStart: 0,
      pageLineCount: PAGE_LINE_COUNT,
    });
    expect(ranges[2]).toMatchObject({
      pageStartOffset: 60,
      pageEndOffset: 65,
      pageLineStart: 60,
      pageLineCount: 5,
    });
  });

  it('splits files without explicit line breaks by byte pages and display rows', () => {
    const bytes = new Uint8Array(PAGE_BYTE_COUNT + 10).fill(0x40);
    const ranges = buildPageRanges(bytes, 'ibm937');

    expect(ranges).toHaveLength(2);
    expect(ranges[0].forceLineBytes).toBe(NO_NEWLINE_DISPLAY_LINE_BYTES);
    expect(ranges[1]).toMatchObject({
      pageStartOffset: PAGE_BYTE_COUNT,
      pageEndOffset: PAGE_BYTE_COUNT + 10,
      pageLineCount: 1,
    });

    const displayLines = buildDisplayLinesForPage(
      bytes.slice(ranges[0].pageStartOffset, ranges[0].pageEndOffset),
      'ibm937',
      ranges[0],
    );

    expect(displayLines).toHaveLength(PAGE_BYTE_COUNT / NO_NEWLINE_DISPLAY_LINE_BYTES);
    expect(displayLines[1]).toMatchObject({
      startOffset: NO_NEWLINE_DISPLAY_LINE_BYTES,
      length: NO_NEWLINE_DISPLAY_LINE_BYTES,
    });
  });

  it('uses the configured page line count for explicit record lines', () => {
    const bytes = Uint8Array.from(Array.from({ length: 120 }, () => 0x15));
    const ranges = buildPageRanges(bytes, 'ibm937', 50);

    expect(ranges).toHaveLength(3);
    expect(ranges[0]).toMatchObject({
      pageEndOffset: 50,
      pageLineCount: 50,
    });
    expect(ranges[2]).toMatchObject({
      pageStartOffset: 100,
      pageEndOffset: 120,
      pageLineCount: 20,
    });
  });

  it('maps configured page lines to byte page size when no line breaks exist', () => {
    const pageLineLimit = 100;
    const pageByteCount = pageLineLimit * NO_NEWLINE_DISPLAY_LINE_BYTES;
    const bytes = new Uint8Array(pageByteCount + 1).fill(0x40);
    const ranges = buildPageRanges(bytes, 'ibm937', pageLineLimit);

    expect(ranges).toHaveLength(2);
    expect(ranges[0]).toMatchObject({
      pageStartOffset: 0,
      pageEndOffset: pageByteCount,
      pageLineCount: pageLineLimit,
    });
    expect(ranges[1]).toMatchObject({
      pageStartOffset: pageByteCount,
      pageEndOffset: pageByteCount + 1,
      pageLineCount: 1,
    });
  });

  it('uses fixed Zowe LRECL records instead of no-newline byte display rows', () => {
    const bytes = new Uint8Array(80 * 65).fill(0x40);
    const ranges = buildPageRanges(bytes, 'ibm937', undefined, {
      source: 'zowe',
      recordFormat: 'FB',
      logicalRecordLength: 80,
    });

    expect(ranges).toHaveLength(3);
    expect(ranges[0].forceLineBytes).toBeUndefined();
    expect(ranges[0]).toMatchObject({
      pageStartOffset: 0,
      pageEndOffset: 80 * PAGE_LINE_COUNT,
      pageLineCount: PAGE_LINE_COUNT,
    });
    expect(ranges[2]).toMatchObject({
      pageStartOffset: 80 * 60,
      pageEndOffset: 80 * 65,
      pageLineStart: 60,
      pageLineCount: 5,
    });

    const displayLines = buildDisplayLinesForPage(
      bytes.slice(ranges[2].pageStartOffset, ranges[2].pageEndOffset),
      'ibm937',
      ranges[2],
      {
        source: 'zowe',
        recordFormat: 'FB',
        logicalRecordLength: 80,
      },
    );

    expect(displayLines).toHaveLength(5);
    expect(displayLines[0]).toMatchObject({ lineIndex: 60, startOffset: 80 * 60, length: 80 });
  });

  it('keeps a single fixed record as a record line even when it is wider than byte fallback rows', () => {
    const bytes = new Uint8Array(120).fill(0x40);
    const metadata = {
      source: 'zowe' as const,
      recordFormat: 'FB',
      logicalRecordLength: 120,
    };
    const ranges = buildPageRanges(bytes, 'ibm937', 30, metadata);

    expect(ranges).toHaveLength(1);
    expect(ranges[0].forceLineBytes).toBeUndefined();

    const displayLines = buildDisplayLinesForPage(bytes, 'ibm937', ranges[0], metadata);
    expect(displayLines).toEqual([{ lineIndex: 0, startOffset: 0, length: 120 }]);
  });
});
