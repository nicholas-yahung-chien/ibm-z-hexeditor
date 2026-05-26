import type { EditorSnapshot, PreviewEntry } from '../../src/protocol';

export type SearchMode = 'unicode' | 'hex';

export interface SearchResult {
  offset: number;
  length: number;
}

export interface SearchOutcome {
  results: SearchResult[];
  error?: 'empty' | 'invalidHex' | 'invalidPattern';
}

interface TextSpan {
  start: number;
  end: number;
  entry: PreviewEntry;
}

export function searchSnapshot(snapshot: EditorSnapshot, mode: SearchMode, query: string): SearchOutcome {
  return mode === 'hex'
    ? searchHex(snapshot, query)
    : searchUnicode(snapshot, query);
}

export function searchHex(snapshot: EditorSnapshot, query: string): SearchOutcome {
  const parsed = parseHexQuery(query);
  if (parsed.error) {
    return { results: [], error: parsed.error };
  }

  const bytes = parsed.bytes;
  if (bytes.length === 0) {
    return { results: [], error: 'empty' };
  }

  const pageStartOffset = snapshot.page?.pageStartOffset ?? 0;
  const results: SearchResult[] = [];
  for (let index = 0; index <= snapshot.cells.length - bytes.length; index++) {
    let matched = true;
    for (let offset = 0; offset < bytes.length; offset++) {
      if (snapshot.cells[index + offset].value !== bytes[offset]) {
        matched = false;
        break;
      }
    }
    if (matched) {
      results.push({ offset: pageStartOffset + index, length: bytes.length });
    }
  }
  return { results };
}

export function searchUnicode(snapshot: EditorSnapshot, query: string): SearchOutcome {
  const trimmed = query.trim();
  if (!trimmed) {
    return { results: [], error: 'empty' };
  }

  if (isSingleWildcard(trimmed)) {
    return {
      results: snapshot.lines
        .filter(line => line.length > 0)
        .map(line => ({ offset: line.startOffset, length: line.length })),
    };
  }

  const pattern = unicodePatternToRegExp(trimmed);
  if (!pattern) {
    return { results: [], error: 'invalidPattern' };
  }

  const extendToLineStart = hasLeadingUnescapedWildcard(trimmed);
  const extendToLineEnd = hasTrailingUnescapedWildcard(trimmed);
  const results: SearchResult[] = [];
  for (const line of snapshot.lines) {
    const { text, spans } = flattenPreview(previewEntriesForLine(snapshot.preview, line));
    for (const match of text.matchAll(pattern)) {
      const start = match.index ?? 0;
      const matchedText = match[0];
      if (matchedText.length === 0) {
        continue;
      }

      const rangeStart = extendToLineStart ? 0 : start;
      const rangeEnd = extendToLineEnd ? text.length : start + matchedText.length;
      const result = byteRangeForTextRange(spans, rangeStart, rangeEnd);
      if (result) {
        results.push(result);
      }
    }
  }
  return { results };
}

function parseHexQuery(query: string): { bytes: number[]; error?: SearchOutcome['error'] } {
  const trimmed = query.trim();
  if (!trimmed) {
    return { bytes: [], error: 'empty' };
  }

  const tokens = trimmed.split(/\s+/);
  if (tokens.length === 1 && /^0?x?[0-9a-fA-F]{3,}$/.test(tokens[0])) {
    return { bytes: [], error: 'invalidHex' };
  }

  const bytes: number[] = [];
  for (const token of tokens) {
    const match = /^(?:0x)?([0-9a-fA-F]{1,2})$/.exec(token);
    if (!match) {
      return { bytes: [], error: 'invalidHex' };
    }
    bytes.push(Number.parseInt(match[1], 16));
  }
  return { bytes };
}

function unicodePatternToRegExp(query: string): RegExp | null {
  let source = '';
  for (let index = 0; index < query.length; index++) {
    const char = query[index];
    if (char === '\\') {
      const next = query[index + 1];
      if (next === '.' || next === '*' || next === '\\') {
        source += escapeRegExp(next);
        index++;
        continue;
      }
      source += '\\\\';
      continue;
    }
    if (char === '.') {
      source += '[\\s\\S]';
      continue;
    }
    if (char === '*') {
      source += '[\\s\\S]*?';
      continue;
    }
    source += escapeRegExp(char);
  }

  try {
    return new RegExp(source, 'gu');
  } catch {
    return null;
  }
}

function previewEntriesForLine(
  preview: readonly PreviewEntry[],
  line: EditorSnapshot['lines'][number],
): PreviewEntry[] {
  const lineStart = line.startOffset;
  const lineEnd = line.startOffset + line.length;
  return preview.filter(entry => {
    const entryStart = entry.byteOffset;
    const entryEnd = entry.byteOffset + entry.byteLength;
    return entryStart < lineEnd && entryEnd > lineStart;
  });
}

function isSingleWildcard(query: string): boolean {
  return query === '*';
}

function hasLeadingUnescapedWildcard(query: string): boolean {
  return query.startsWith('*');
}

function hasTrailingUnescapedWildcard(query: string): boolean {
  if (!query.endsWith('*')) {
    return false;
  }

  let slashCount = 0;
  for (let index = query.length - 2; index >= 0 && query[index] === '\\'; index--) {
    slashCount++;
  }
  return slashCount % 2 === 0;
}

function flattenPreview(preview: readonly PreviewEntry[]): { text: string; spans: TextSpan[] } {
  let text = '';
  const spans: TextSpan[] = [];
  for (const entry of preview) {
    const start = text.length;
    text += entry.text;
    spans.push({ start, end: text.length, entry });
  }
  return { text, spans };
}

function byteRangeForTextRange(spans: readonly TextSpan[], start: number, end: number): SearchResult | null {
  const matchingSpans = spans.filter(span => span.start < end && span.end > start);
  if (matchingSpans.length === 0) {
    return null;
  }

  const byteStart = Math.min(...matchingSpans.map(span => span.entry.byteOffset));
  const byteEnd = Math.max(...matchingSpans.map(span => span.entry.byteOffset + span.entry.byteLength));
  return {
    offset: byteStart,
    length: Math.max(1, byteEnd - byteStart),
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
}
