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
});
