import type { AnalysisResult } from '../../../src/inspector/inspect937';

interface Props {
  result: AnalysisResult | null;
}

export function DiagnosticsStrip({ result }: Props) {
  if (!result) {
    return null;
  }

  const problemCount = result.counts.MISSING_SO +
    result.counts.MISSING_SI +
    result.counts.MISSING_SI_AT_EOF +
    result.counts.INVALID_OR_UNKNOWN;
  const dbcsPairCount = result.counts.DBCS + result.counts.DBCS_AMBIGUOUS;
  const warningCount = result.counts.AMBIGUOUS + result.counts.DBCS_AMBIGUOUS;

  return (
    <section className={problemCount > 0 ? 'diagnostics diagnostics-problem' : 'diagnostics'}>
      <span className={`codicon ${problemCount > 0 ? 'codicon-warning' : 'codicon-pass'}`} aria-hidden="true" />
      <span>{problemCount > 0 ? `${problemCount} DBCS issue(s)` : 'SO/SI structure valid'}</span>
      <span>{dbcsPairCount} DBCS pair(s)</span>
      <span>{warningCount} warning(s)</span>
    </section>
  );
}
