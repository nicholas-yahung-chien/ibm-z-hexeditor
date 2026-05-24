import { useEffect, useMemo, useState } from 'react';
import type { EditorSnapshot, EditorViewSettings, ToWebviewMessage } from '../../src/protocol';
import { HexGrid } from './components/HexGrid';
import { DiagnosticsStrip } from './components/DiagnosticsStrip';
import { vscode } from './vscode';

const EDITING_HINT = 'Arrows move, 0-9/A-F edits, Ins inserts 00, Del/Backspace deletes, Ctrl+S saves';

interface JumpTarget {
  offset: number;
  length: number;
  token: number;
}

export default function App() {
  const [snapshot, setSnapshot] = useState<EditorSnapshot | null>(null);
  const [viewSettings, setViewSettings] = useState<EditorViewSettings>({ condenseMode: false, showRuler: false });
  const [status, setStatus] = useState('Waiting for editor data...');
  const [jumpTarget, setJumpTarget] = useState<JumpTarget | null>(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<ToWebviewMessage>) => {
      const message = event.data;
      if (message.type === 'init' || message.type === 'snapshot' || message.type === 'saved') {
        setSnapshot(message.snapshot);
        setStatus(message.type === 'saved' ? 'Saved' : message.snapshot.dirty ? 'Modified' : 'Ready');
      }

      if (message.type === 'error') {
        setStatus(message.message);
      }

      if (message.type === 'status') {
        setStatus(message.message);
      }

      if (message.type === 'settings') {
        setViewSettings(message.settings);
      }
    };

    window.addEventListener('message', handleMessage);
    vscode.postMessage({ type: 'ready' });
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fileLabel = useMemo(() => {
    if (!snapshot) {
      return 'IBM Z HEX ON Editor';
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
              title="Show header"
              aria-label="Show header"
              aria-expanded="false"
              onClick={() => setHeaderCollapsed(false)}
            >
              <SvgIcon name="chevron-down" />
            </button>
            <div className="collapsed-header-meta">
              <strong>{fileLabel}</strong>
              <span>{snapshot?.fileEncoding ?? 'encoding'}</span>
              <span>{status}</span>
            </div>
          </>
        ) : (
          <>
            <div>
              <div className="title-row">
                <SvgIcon name="hex" />
                <h1>{fileLabel}</h1>
              </div>
              <div className="meta-row">
                <span>{snapshot?.fileEncoding ?? 'encoding'}</span>
                <span>raw bytes</span>
                <span>{snapshot ? `${snapshot.cells.length.toLocaleString()} bytes` : 'loading'}</span>
                <span>{status}</span>
              </div>
              <div className="hint-row">{EDITING_HINT}</div>
            </div>
            <div className="toolbar-actions" aria-label="File actions">
              <button
                className="icon-button icon-button-secondary header-toggle"
                type="button"
                title="Hide header"
                aria-label="Hide header"
                aria-expanded="true"
                onClick={() => setHeaderCollapsed(true)}
              >
                <SvgIcon name="chevron-up" />
              </button>
              <button
                className="icon-button icon-button-secondary"
                type="button"
                title="Reload"
                aria-label="Reload"
                onClick={() => vscode.postMessage({ type: 'reload' })}
              >
                <SvgIcon name="refresh" />
              </button>
              <button
                className="icon-button icon-button-secondary"
                type="button"
                title="Revert"
                aria-label="Revert"
                disabled={!snapshot?.dirty}
                onClick={() => vscode.postMessage({ type: 'revert' })}
              >
                <SvgIcon name="revert" />
              </button>
              <button
                className="icon-button icon-button-primary"
                type="button"
                title="Save"
                aria-label="Save"
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
        <main className="empty-state">{status}</main>
      )}
    </div>
  );
}

type SvgIconName = 'chevron-down' | 'chevron-up' | 'hex' | 'refresh' | 'revert' | 'save';

function SvgIcon({ name }: { name: SvgIconName }) {
  return (
    <svg className="svg-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {name === 'chevron-down' ? <path d="M6 9l6 6 6-6" /> : null}
      {name === 'chevron-up' ? <path d="M6 15l6-6 6 6" /> : null}
      {name === 'hex' ? (
        <>
          <path d="M7 4h10l5 8-5 8H7l-5-8 5-8z" />
          <path d="M8 9v6M16 9v6M10 12h4" />
        </>
      ) : null}
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
          <path d="M9 7H4v5" />
          <path d="M5 12a7 7 0 1 0 2-5" />
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
