import { useEffect, useMemo, useState } from 'react';
import type { EditorSnapshot, ToWebviewMessage } from '../../src/protocol';
import { HexGrid } from './components/HexGrid';
import { DiagnosticsStrip } from './components/DiagnosticsStrip';
import { vscode } from './vscode';

const EDITING_HINT = 'Arrows move, 0-9/A-F edits, Ins inserts 00, Del/Backspace deletes, Ctrl+S saves';

interface JumpTarget {
  offset: number;
  token: number;
}

export default function App() {
  const [snapshot, setSnapshot] = useState<EditorSnapshot | null>(null);
  const [status, setStatus] = useState('Waiting for editor data...');
  const [jumpTarget, setJumpTarget] = useState<JumpTarget | null>(null);

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
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <div className="title-row">
            <span className="codicon codicon-symbol-key" aria-hidden="true" />
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
        <button className="toolbar-button" type="button" onClick={() => vscode.postMessage({ type: 'save' })}>
          <span className="codicon codicon-save" aria-hidden="true" />
          <span>Save</span>
        </button>
      </header>

      {snapshot ? (
        <>
          <DiagnosticsStrip
            result={snapshot.diagnostics}
            onJump={offset => setJumpTarget(current => ({ offset, token: (current?.token ?? 0) + 1 }))}
          />
          <HexGrid snapshot={snapshot} jumpTarget={jumpTarget} />
        </>
      ) : (
        <main className="empty-state">{status}</main>
      )}
    </div>
  );
}
