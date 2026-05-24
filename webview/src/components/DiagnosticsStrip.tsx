import { useMemo, useState } from 'react';
import type { AnalysisResult, DiagnosticEvent, DiagnosticKind } from '../../../src/inspector/inspectIbmDbcs';
import { PROBLEM_KINDS, WARNING_KINDS } from '../../../src/inspector/inspectIbmDbcs';
import { DIAGNOSTIC_KIND_LABELS, DIAGNOSTIC_KIND_ORDER, getDiagnosticHeaderCounts } from '../../../src/diagnosticsSummary';
import { t } from '../i18n';

interface Props {
  result: AnalysisResult | null;
  onJump: (event: DiagnosticEvent) => void;
}

function eventLabel(event: DiagnosticEvent): string {
  const offset = event.offset.toString(16).toUpperCase().padStart(6, '0');
  const bytes = event.bytesHex ? ` ${event.bytesHex}` : ' EOF';
  return `${offset}${bytes}`;
}

export function DiagnosticsStrip({ result, onJump }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [activeKind, setActiveKind] = useState<DiagnosticKind | 'all'>('all');
  const [activeEventKey, setActiveEventKey] = useState<string | null>(null);

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

  const { problemCount, dbcsPairCount, warningCount } = getDiagnosticHeaderCounts(result);
  const jumpKinds = new Set<DiagnosticKind>([...PROBLEM_KINDS, ...WARNING_KINDS]);
  const jumpEvents = details
    .filter(item => jumpKinds.has(item.kind))
    .flatMap(item => item.events);
  const filteredJumpEvents = activeKind === 'all'
    ? jumpEvents
    : jumpEvents.filter(event => event.kind === activeKind);
  const jumpGroups = details
    .filter(item => jumpKinds.has(item.kind))
    .filter(item => activeKind === 'all' || item.kind === activeKind);
  const activeIndex = filteredJumpEvents.findIndex(event => eventKey(event) === activeEventKey);

  const navigateTo = (event: DiagnosticEvent) => {
    setActiveEventKey(eventKey(event));
    onJump(event);
  };

  const navigateRelative = (delta: number) => {
    if (filteredJumpEvents.length === 0) {
      return;
    }

    const currentIndex = filteredJumpEvents.findIndex(event => eventKey(event) === activeEventKey);
    const startIndex = currentIndex >= 0 ? currentIndex : (delta > 0 ? -1 : 0);
    const nextIndex = (startIndex + delta + filteredJumpEvents.length) % filteredJumpEvents.length;
    navigateTo(filteredJumpEvents[nextIndex]);
  };

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
        <span>{problemCount > 0 ? t('diagnosticsIssueCount', { count: problemCount }) : t('diagnosticsStructureValid')}</span>
        <span>{t('diagnosticsPairCount', { count: dbcsPairCount })}</span>
        <span>{t('diagnosticsWarningCount', { count: warningCount })}</span>
      </button>

      {expanded ? (
        <div className="diagnostics-detail">
          <div className="diagnostics-nav" aria-label={t('diagnosticNavigation')}>
            <button
              className="diagnostic-nav-button"
              type="button"
              disabled={filteredJumpEvents.length === 0}
              onClick={() => navigateRelative(-1)}
            >
              <span className="codicon codicon-arrow-up" aria-hidden="true" />
              <span>{t('previous')}</span>
            </button>
            <button
              className="diagnostic-nav-button"
              type="button"
              disabled={filteredJumpEvents.length === 0}
              onClick={() => navigateRelative(1)}
            >
              <span>{t('next')}</span>
              <span className="codicon codicon-arrow-down" aria-hidden="true" />
            </button>
            <span className="diagnostic-nav-position">
              {filteredJumpEvents.length > 0
                ? activeIndex >= 0
                  ? t('diagnosticsPosition', { current: activeIndex + 1, total: filteredJumpEvents.length })
                  : t('diagnosticsInactivePosition', { total: filteredJumpEvents.length })
                : t('diagnosticsEmptyPosition')}
            </span>
            {activeKind !== 'all' ? (
              <button
                className="diagnostic-filter-clear"
                type="button"
                onClick={() => {
                  setActiveKind('all');
                  setActiveEventKey(null);
                }}
              >
                {t('clearFilter')}
              </button>
            ) : null}
          </div>

          <div className="diagnostics-counts" aria-label={t('diagnosticCategoryCounts')}>
            {details.map(item => (
              <button
                type="button"
                disabled={!jumpKinds.has(item.kind)}
                onClick={() => {
                  if (!jumpKinds.has(item.kind)) {
                    return;
                  }
                  setExpanded(true);
                  setActiveKind(current => current === item.kind ? 'all' : item.kind);
                  setActiveEventKey(null);
                }}
                className={[
                  'diagnostic-pill',
                  PROBLEM_KINDS.has(item.kind) ? 'diagnostic-pill-problem' : '',
                  WARNING_KINDS.has(item.kind) ? 'diagnostic-pill-warning' : '',
                  jumpKinds.has(item.kind) ? 'diagnostic-pill-filterable' : '',
                  activeKind === item.kind ? 'diagnostic-pill-active' : '',
                ].filter(Boolean).join(' ')}
                key={item.kind}
              >
                <span>{DIAGNOSTIC_KIND_LABELS[item.kind]}</span>
                <strong>{item.count.toLocaleString()}</strong>
              </button>
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
                        className={[
                          'diagnostic-location',
                          activeEventKey === eventKey(event) ? 'diagnostic-location-active' : '',
                        ].filter(Boolean).join(' ')}
                        type="button"
                        key={`${event.kind}-${event.offset}-${event.bytesHex}-${index}`}
                        title={event.message}
                        onClick={() => navigateTo(event)}
                      >
                        {eventLabel(event)}
                      </button>
                    ))}
                    {item.events.length > 12 ? (
                      <span className="diagnostic-more">{t('diagnosticsMore', { count: item.events.length - 12 })}</span>
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

function eventKey(event: DiagnosticEvent): string {
  return `${event.kind}:${event.offset}:${event.length}:${event.bytesHex}`;
}
