import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DBCS_AMBIGUOUS_EXCLUSION_PAIRS,
  DEFAULT_DBCS_AMBIGUOUS_EXCLUSION_RULES,
  pairKey,
  parseDbcsAmbiguousExclusionRules,
  parseDbcsAmbiguousPair,
  shouldSeedDefaultDbcsAmbiguousExclusions,
} from '../src/dbcsAmbiguousExclusions';

describe('DBCS ambiguous exclusion rule parsing', () => {
  it('parses supported byte-pair formats', () => {
    expect(parseDbcsAmbiguousPair('40 40')).toBe(0x4040);
    expect(parseDbcsAmbiguousPair('0x40 0x40')).toBe(0x4040);
    expect(parseDbcsAmbiguousPair('4040')).toBe(0x4040);
    expect(parseDbcsAmbiguousPair('5c,5c')).toBe(0x5c5c);
  });

  it('parses object and string rule entries while reporting invalid entries', () => {
    const result = parseDbcsAmbiguousExclusionRules([
      { bytes: '40 40', label: 'spaces' },
      '5C 5C',
      { bytes: 'bad' },
      { label: 'missing bytes' },
    ]);

    expect(result.pairs).toEqual(new Set([0x4040, 0x5c5c]));
    expect(result.invalidRules).toHaveLength(2);
  });

  it('keeps built-in defaults explicit and reusable', () => {
    expect(DEFAULT_DBCS_AMBIGUOUS_EXCLUSION_RULES.map(rule => rule.bytes)).toEqual(['40 40', '5C 5C']);
    expect(DEFAULT_DBCS_AMBIGUOUS_EXCLUSION_PAIRS).toEqual(new Set([pairKey(0x40, 0x40), pairKey(0x5c, 0x5c)]));
  });

  it('seeds default rules only when custom exclusions are enabled and not configured', () => {
    expect(shouldSeedDefaultDbcsAmbiguousExclusions({ enabled: false })).toBe(false);
    expect(shouldSeedDefaultDbcsAmbiguousExclusions({ enabled: true })).toBe(true);
    expect(shouldSeedDefaultDbcsAmbiguousExclusions({ enabled: true, globalValue: [] })).toBe(false);
    expect(shouldSeedDefaultDbcsAmbiguousExclusions({ enabled: true, workspaceValue: [] })).toBe(false);
    expect(shouldSeedDefaultDbcsAmbiguousExclusions({ enabled: true, workspaceFolderValue: [] })).toBe(false);
    expect(shouldSeedDefaultDbcsAmbiguousExclusions({ enabled: true, globalValue: 'invalid' })).toBe(false);
  });
});
