import { describe, expect, it } from 'vitest';
import { encodeToIbm937 } from '../src/codec/ibm937';
import { buildRecordsFromText, decodeRecordsToText, replaceNibble } from '../src/recordModel';

describe('record model', () => {
  it('keeps line endings outside of editable IBM-937 bytes', () => {
    const model = buildRecordsFromText('abc測試\r\n下一行');

    expect(model.lines).toHaveLength(2);
    expect(model.lines[0].eol).toBe('\r\n');
    expect(model.lines[1].eol).toBe('');
    expect(decodeRecordsToText(model.cells, model.lines)).toBe('abc測試\r\n下一行');
  });

  it('replaces one nibble without changing byte count', () => {
    const model = buildRecordsFromText('A');
    const original = encodeToIbm937('A')[0];
    const edited = replaceNibble(model.cells, 0, 'low', 0x0);

    expect(edited).toHaveLength(1);
    expect(edited[0].value).toBe(original & 0xf0);
  });
});
