import { useMemo, useState } from 'react';
import type { AnalysisResult, DiagnosticEvent, DiagnosticKind } from '../../../src/inspector/inspect937';
import { PROBLEM_KINDS, WARNING_KINDS } from '../../../src/inspector/inspect937';
import { countDiagnosticProblems, countDiagnosticWarnings, DIAGNOSTIC_KIND_LABELS, DIAGNOSTIC_KIND_ORDER } from '../../../src/diagnosticsSummary';

interface Props {
  result: AnalysisResult | null;
  onJump: (offset: number) => void;
}

function eventLabel(event: DiagnosticEvent): string {
  const offset = event.offset.toString(16).toUpperCase().padStart(6, '0');
  const bytes = event.bytesHex ? ` ${event.bytesHex}` : ' EOF';
  return `${offset}${bytes}`;
}

export function DiagnosticsStrip({ result, onJump }: Props) {
  const [expanded, setExpanded] = useState(false);

  const details = useMemo(() => {
    if (!result) {
      return [];
    }

    return DIAGNOSTIC_KIND_ORDER
      .map(kind => ({
        kind,
        count: result.counts[kind] ?? 0,
        events: result.events.filter(event => event.kind === kind),
      }))
      .filter(item => item.count > 0);
  }, [result]);

  if (!result) {
    return null;
  }

  const problemCount = countDiagnosticProblems(result);
  const dbcsPairCount = result.counts.DBCS + result.counts.DBCS_AMBIGUOUS;
  const warningCount = countDiagnosticWarnings(result);
  const jumpKinds = new Set<DiagnosticKind>([...PROBLEM_KINDS, ...WARNING_KINDS]);
  const jumpGroups = details.filter(item => jumpKinds.has(item.kind));

  return (
    <section className={problemCount > 0 ? 'diagnostics diagnostics-problem' : 'diagnostics'}>
      <button
        className="diagnostics-summary"
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded(current => !current)}
      >
        <span className={`codicon ${expanded ? 'codicon-chevron-down' : 'codicon-chevron-right'}`} aria-hidden="true" />
        <span className={`codicon ${problemCount > 0 ? 'codicon-warning' : 'codicon-pass'}`} aria-hidden="true" />
        <span>{problemCount > 0 ? `${problemCount} DBCS issue(s)` : 'SO/SI structure valid'}</span>
        <span>{dbcsPairCount} DBCS pair(s)</span>
        <span>{warningCount} warning(s)</span>
      </button>

      {expanded ? (
        <div className="diagnostics-detail">
          <div className="diagnostics-counts" aria-label="Diagnostic category counts">
            {details.map(item => (
              <span
                className={[
                  'diagnostic-pill',
                  PROBLEM_KINDS.has(item.kind) ? 'diagnostic-pill-problem' : '',
                  WARNING_KINDS.has(item.kind) ? 'diagnostic-pill-warning' : '',
                ].filter(Boolean).join(' ')}
                key={item.kind}
              >
                <span>{DIAGNOSTIC_KIND_LABELS[item.kind]}</span>
                <strong>{item.count.toLocaleString()}</strong>
              </span>
            ))}
          </div>

          {jumpGroups.length > 0 ? (
            <div className="diagnostics-locations">
              {jumpGroups.map(item => (
                <div className="diagnostic-location-group" key={`loc-${item.kind}`}>
                  <div className="diagnostic-location-title">{DIAGNOSTIC_KIND_LABELS[item.kind]}</div>
                  <div className="diagnostic-location-list">
                    {item.events.slice(0, 12).map((event, index) => (
                      <button
                        className="diagnostic-location"
                        type="button"
                        key={`${event.kind}-${event.offset}-${event.bytesHex}-${index}`}
                        title={event.message}
                        onClick={() => onJump(event.offset)}
                      >
                        {eventLabel(event)}
                      </button>
                    ))}
                    {item.events.length > 12 ? (
                      <span className="diagnostic-more">+{item.events.length - 12} more</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
