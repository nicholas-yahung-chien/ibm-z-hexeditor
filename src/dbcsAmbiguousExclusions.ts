export interface DbcsAmbiguousExclusionRule {
  bytes: string;
  label?: string;
}

export interface ParsedDbcsAmbiguousExclusions {
  pairs: Set<number>;
  invalidRules: string[];
}

export interface DbcsAmbiguousExclusionSeedState {
  enabled: boolean;
  globalValue?: unknown;
  workspaceValue?: unknown;
  workspaceFolderValue?: unknown;
}

export const DEFAULT_DBCS_AMBIGUOUS_EXCLUSION_RULES: readonly DbcsAmbiguousExclusionRule[] = [
  { bytes: '40 40', label: 'EBCDIC spaces' },
  { bytes: '5C 5C', label: 'COBOL repeated asterisks' },
];

export const DEFAULT_DBCS_AMBIGUOUS_EXCLUSION_PAIRS = new Set(
  DEFAULT_DBCS_AMBIGUOUS_EXCLUSION_RULES.map(rule => parseDbcsAmbiguousPair(rule.bytes)!),
);

export function parseDbcsAmbiguousExclusionRules(value: unknown): ParsedDbcsAmbiguousExclusions {
  const pairs = new Set<number>();
  const invalidRules: string[] = [];

  if (!Array.isArray(value)) {
    return {
      pairs,
      invalidRules: value === undefined ? [] : ['Expected an array of DBCS ambiguous exclusion rules.'],
    };
  }

  value.forEach((entry, index) => {
    const bytes = typeof entry === 'string'
      ? entry
      : isRuleLike(entry)
        ? entry.bytes
        : undefined;

    if (bytes === undefined) {
      invalidRules.push(`Rule ${index + 1}: expected { "bytes": "NN NN" }.`);
      return;
    }

    const pair = parseDbcsAmbiguousPair(bytes);
    if (pair === undefined) {
      invalidRules.push(`Rule ${index + 1}: invalid byte pair "${bytes}".`);
      return;
    }

    pairs.add(pair);
  });

  return { pairs, invalidRules };
}

export function parseDbcsAmbiguousPair(value: string): number | undefined {
  const normalized = value.trim().replace(/,/g, ' ').replace(/\s+/g, ' ');
  const spacedMatch = normalized.match(/^(?:0x)?([0-9a-fA-F]{2}) (?:0x)?([0-9a-fA-F]{2})$/);
  if (spacedMatch) {
    return pairKey(Number.parseInt(spacedMatch[1], 16), Number.parseInt(spacedMatch[2], 16));
  }

  const compactMatch = normalized.match(/^(?:0x)?([0-9a-fA-F]{4})$/);
  if (compactMatch) {
    return Number.parseInt(compactMatch[1], 16);
  }

  return undefined;
}

export function shouldSeedDefaultDbcsAmbiguousExclusions(state: DbcsAmbiguousExclusionSeedState): boolean {
  return state.enabled &&
    state.globalValue === undefined &&
    state.workspaceValue === undefined &&
    state.workspaceFolderValue === undefined;
}

export function pairKey(b1: number, b2: number): number {
  return ((b1 & 0xFF) << 8) | (b2 & 0xFF);
}

function isRuleLike(value: unknown): value is DbcsAmbiguousExclusionRule {
  return typeof value === 'object' &&
    value !== null &&
    'bytes' in value &&
    typeof (value as { bytes: unknown }).bytes === 'string';
}
