import type { AnalysisResult, DiagnosticKind } from './inspector/inspectIbmDbcs';
import { PROBLEM_KINDS, WARNING_KINDS } from './inspector/inspectIbmDbcs';

export const DIAGNOSTIC_KIND_LABELS: Record<DiagnosticKind, string> = {
  SO: 'SO',
  SI: 'SI',
  SBCS: 'SBCS',
  DBCS: 'DBCS',
  DBCS_AMBIGUOUS: 'DBCS ambiguous',
  MISSING_SO: 'Missing SO',
  MISSING_SI: 'Missing SI',
  MISSING_SI_AT_EOF: 'Missing SI at EOF',
  UNMATCHED_SO: 'Unmatched SO',
  UNMATCHED_SI: 'Unmatched SI',
  AMBIGUOUS: 'Ambiguous',
  INVALID_OR_UNKNOWN: 'Invalid or unknown',
};

export const DIAGNOSTIC_KIND_ORDER: DiagnosticKind[] = [
  'MISSING_SO',
  'MISSING_SI',
  'MISSING_SI_AT_EOF',
  'UNMATCHED_SO',
  'UNMATCHED_SI',
  'INVALID_OR_UNKNOWN',
  'DBCS_AMBIGUOUS',
  'AMBIGUOUS',
  'SO',
  'SI',
  'DBCS',
  'SBCS',
];

export function countDiagnosticProblems(result: AnalysisResult | null): number {
  if (!result) {
    return 0;
  }

  let count = 0;
  for (const kind of PROBLEM_KINDS) {
    count += result.counts[kind] ?? 0;
  }
  return count;
}

export function countDiagnosticWarnings(result: AnalysisResult | null): number {
  if (!result) {
    return 0;
  }

  let count = 0;
  for (const kind of WARNING_KINDS) {
    count += result.counts[kind] ?? 0;
  }
  return count;
}

export interface DiagnosticHeaderCounts {
  problemCount: number;
  dbcsPairCount: number;
  warningCount: number;
}

export function getDiagnosticHeaderCounts(result: AnalysisResult | null): DiagnosticHeaderCounts {
  return {
    problemCount: countDiagnosticProblems(result),
    dbcsPairCount: result?.counts.DBCS ?? 0,
    warningCount: countDiagnosticWarnings(result),
  };
}

export function summarizeProblemCounts(
  result: AnalysisResult | null,
  labels: Record<DiagnosticKind, string> = DIAGNOSTIC_KIND_LABELS,
): string {
  if (!result) {
    return '';
  }

  return DIAGNOSTIC_KIND_ORDER
    .filter(kind => PROBLEM_KINDS.has(kind))
    .map(kind => ({ kind, count: result.counts[kind] ?? 0 }))
    .filter(item => item.count > 0)
    .map(item => `${labels[item.kind]}: ${item.count}`)
    .join(', ');
}
