import { useEffect, useMemo, useRef, useState } from 'react';
import type { EditorSnapshot, EditorViewSettings, ToWebviewMessage } from '../../src/protocol';
import { HexGrid } from './components/HexGrid';
import { DiagnosticsStrip } from './components/DiagnosticsStrip';
import { setLocale, t } from './i18n';
import { vscode } from './vscode';

interface JumpTarget {
  offset: number;
  length: number;
  token: number;
}

const initialLocale = navigator.language || 'en';
setLocale(initialLocale);

export default function App() {
  const [snapshot, setSnapshot] = useState<EditorSnapshot | null>(null);
  const [viewSettings, setViewSettings] = useState<EditorViewSettings>({
    condenseMode: false,
    showRuler: false,
    performanceLogging: false,
    locale: initialLocale,
  });
  const [status, setStatus] = useState(t('preparingEditorData'));
  const [jumpTarget, setJumpTarget] = useState<JumpTarget | null>(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(shouldCollapseHeaderFromUrl);
  const snapshotRef = useRef<EditorSnapshot | null>(null);
  const performanceLoggingRef = useRef(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<ToWebviewMessage>) => {
      const message = event.data;
      if (message.type === 'init' || message.type === 'snapshot' || message.type === 'saved') {
        const receivedAt = performance.now();
        const receivedEpochMs = Date.now();
        snapshotRef.current = message.snapshot;
        setSnapshot(message.snapshot);
        setStatus(message.type === 'saved' ? t('saved') : message.snapshot.dirty ? t('modified') : t('ready'));
        if (message.perf && performanceLoggingRef.current) {
          reportSnapshotRender(message.perf.phase, message.perf.sentEpochMs, receivedEpochMs, receivedAt, message.snapshot);
        }
      }

      if (message.type === 'error') {
        setStatus(message.message);
      }

      if (message.type === 'status') {
        setStatus(message.message);
      }

      if (message.type === 'settings') {
        setLocale(message.settings.locale);
        performanceLoggingRef.current = message.settings.performanceLogging;
        setViewSettings(message.settings);
        if (snapshotRef.current === null) {
          setStatus(t('preparingEditorData'));
        }
      }
    };

    window.addEventListener('message', handleMessage);
    vscode.postMessage({ type: 'ready' });
    installDemoSnapshotsIfRequested();
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fileLabel = useMemo(() => {
    if (!snapshot) {
      return t('appTitle');
    }
    return snapshot.fileName.replace(/^.*[\\/]/, '');
  }, [snapshot]);

  return (
    <div
      className={[
        'app-shell',
        viewSettings.condenseMode ? 'condense-mode' : '',
        headerCollapsed ? 'header-collapsed' : '',
      ].filter(Boolean).join(' ')}
    >
      <header className={['top-bar', headerCollapsed ? 'top-bar-collapsed' : ''].filter(Boolean).join(' ')}>
        {headerCollapsed ? (
          <>
            <button
              className="icon-button icon-button-secondary header-toggle"
              type="button"
              title={t('showHeader')}
              aria-label={t('showHeader')}
              aria-expanded="false"
              onClick={() => setHeaderCollapsed(false)}
            >
              <SvgIcon name="chevron-down" />
            </button>
            <div className="collapsed-header-meta">
              <strong>{fileLabel}</strong>
              <span>{snapshot?.fileEncoding ?? t('encodingFallback')}</span>
              <span>{status}</span>
            </div>
          </>
        ) : (
          <>
            <div>
              <div className="title-row">
                <h1>{fileLabel}</h1>
              </div>
              <div className="meta-row">
                <span>{snapshot?.fileEncoding ?? t('encodingFallback')}</span>
                <span>{t('rawBytes')}</span>
                <span>{snapshot ? t('bytes', { count: snapshot.cells.length.toLocaleString() }) : t('loading')}</span>
                <span>{status}</span>
              </div>
              <div className="hint-row">{t('editingHint')}</div>
            </div>
            <div className="toolbar-actions" aria-label={t('fileActions')}>
              <button
                className="icon-button icon-button-secondary header-toggle"
                type="button"
                title={t('hideHeader')}
                aria-label={t('hideHeader')}
                aria-expanded="true"
                onClick={() => setHeaderCollapsed(true)}
              >
                <SvgIcon name="chevron-up" />
              </button>
              <button
                className="icon-button icon-button-secondary"
                type="button"
                title={t('reload')}
                aria-label={t('reload')}
                onClick={() => vscode.postMessage({ type: 'reload' })}
              >
                <SvgIcon name="refresh" />
              </button>
              <button
                className="icon-button icon-button-secondary"
                type="button"
                title={t('revert')}
                aria-label={t('revert')}
                disabled={!snapshot?.dirty}
                onClick={() => vscode.postMessage({ type: 'revert' })}
              >
                <SvgIcon name="revert" />
              </button>
              <button
                className="icon-button icon-button-primary"
                type="button"
                title={t('save')}
                aria-label={t('save')}
                onClick={() => vscode.postMessage({ type: 'save' })}
              >
                <SvgIcon name="save" />
              </button>
            </div>
          </>
        )}
      </header>

      {snapshot ? (
        <>
          <DiagnosticsStrip
            result={snapshot.diagnostics}
            onJump={event => setJumpTarget(current => ({
              offset: event.offset,
              length: event.length,
              token: (current?.token ?? 0) + 1,
            }))}
          />
          <HexGrid
            snapshot={snapshot}
            jumpTarget={jumpTarget}
            condenseMode={viewSettings.condenseMode}
            showRuler={viewSettings.showRuler}
          />
        </>
      ) : (
        <main className="loading-state" aria-busy="true" aria-live="polite">
          <div className="loading-spinner" aria-hidden="true" />
          <div className="loading-copy">
            <strong>{status}</strong>
            <span>{t('preparingEditorDataDetail')}</span>
          </div>
          <div className="loading-progress" aria-hidden="true">
            <span />
          </div>
        </main>
      )}
    </div>
  );
}

function reportSnapshotRender(
  phase: string,
  sentEpochMs: number,
  receivedEpochMs: number,
  receivedAt: number,
  snapshot: EditorSnapshot,
): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      vscode.postMessage({
        type: 'performanceLog',
        phase: 'snapshotRender',
        fields: {
          phase,
          transportMs: Math.max(0, receivedEpochMs - sentEpochMs),
          renderMs: roundMs(performance.now() - receivedAt),
          bytes: snapshot.cells.length,
          lines: snapshot.lines.length,
          previewEntries: snapshot.preview.length,
          diagnosticEvents: snapshot.diagnostics?.events.length ?? 0,
        },
      });
    });
  });
}

function roundMs(value: number): number {
  return Number(value.toFixed(2));
}

function shouldCollapseHeaderFromUrl(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get('header') === 'collapsed';
}

function installDemoSnapshotsIfRequested(): void {
  const params = new URLSearchParams(window.location.search);
  if (!import.meta.env.DEV || !params.has('demo')) {
    return;
  }

  void import('./demoSnapshots')
    .then((module: { installDemoSnapshots: () => void }) => module.installDemoSnapshots())
    .catch(error => console.error('Unable to install demo snapshots', error));
}

type SvgIconName = 'chevron-down' | 'chevron-up' | 'refresh' | 'revert' | 'save';

function SvgIcon({ name }: { name: SvgIconName }) {
  return (
    <svg className="svg-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {name === 'chevron-down' ? <path d="M6 9l6 6 6-6" /> : null}
      {name === 'chevron-up' ? <path d="M6 15l6-6 6 6" /> : null}
      {name === 'refresh' ? (
        <>
          <path d="M20 6v5h-5" />
          <path d="M4 18v-5h5" />
          <path d="M18.5 9A7 7 0 0 0 6 7.5L4 10" />
          <path d="M5.5 15A7 7 0 0 0 18 16.5l2-2.5" />
        </>
      ) : null}
      {name === 'revert' ? (
        <>
          <path d="M9 5l-6 6 6 6" />
          <path d="M3 11h10a7 7 0 0 1 7 7" />
          <path d="M20 18v1" />
        </>
      ) : null}
      {name === 'save' ? (
        <>
          <path d="M5 4h12l2 2v14H5V4z" />
          <path d="M8 4v6h8V4M8 20v-6h8v6" />
        </>
      ) : null}
    </svg>
  );
}
