import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EditorSnapshot, EditorViewSettings, ToWebviewMessage } from '../../src/protocol';
import { HexGrid } from './components/HexGrid';
import { DiagnosticsStrip } from './components/DiagnosticsStrip';
import { setLocale, t } from './i18n';
import { searchSnapshot, type SearchMode, type SearchResult } from './search';
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
    renderMode: 'full',
    pageLineLimit: 30,
    performanceLogging: false,
    locale: initialLocale,
  });
  const [status, setStatus] = useState(t('preparingEditorData'));
  const [jumpTarget, setJumpTarget] = useState<JumpTarget | null>(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(shouldCollapseHeaderFromUrl);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>('unicode');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState<{ mode: SearchMode; query: string } | null>(null);
  const [searchIndex, setSearchIndex] = useState(0);
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

  const openSearch = useCallback(() => setSearchOpen(true), []);

  useEffect(() => {
    const handleSearchShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        openSearch();
      }
    };

    window.addEventListener('keydown', handleSearchShortcut, true);
    return () => window.removeEventListener('keydown', handleSearchShortcut, true);
  }, [openSearch]);

  const fileLabel = useMemo(() => {
    if (!snapshot) {
      return t('appTitle');
    }
    return snapshot.fileName.replace(/^.*[\\/]/, '');
  }, [snapshot]);

  const searchOutcome = useMemo(() => {
    if (!snapshot || !activeSearch?.query.trim()) {
      return { results: [] as SearchResult[] };
    }
    return searchSnapshot(snapshot, activeSearch.mode, activeSearch.query);
  }, [activeSearch, snapshot]);

  useEffect(() => {
    setSearchIndex(0);
  }, [activeSearch?.mode, activeSearch?.query, snapshot?.page?.pageIndex]);

  useEffect(() => {
    if (searchOutcome.results.length > 0 && searchIndex >= searchOutcome.results.length) {
      setSearchIndex(0);
    }
  }, [searchIndex, searchOutcome.results.length]);

  const jumpToSearchResult = useCallback((index: number) => {
    const result = searchOutcome.results[index];
    if (!result) {
      return;
    }
    setSearchIndex(index);
    setJumpTarget(current => ({
      offset: result.offset,
      length: result.length,
      token: (current?.token ?? 0) + 1,
    }));
  }, [searchOutcome.results]);

  const startSearch = useCallback(() => {
    if (!snapshot) {
      return;
    }

    const query = searchQuery.trim();
    if (!query) {
      setActiveSearch(null);
      return;
    }

    const mode = searchMode;
    const outcome = searchSnapshot(snapshot, mode, query);
    setActiveSearch({ mode, query });
    setSearchIndex(0);
    const result = outcome.results[0];
    if (result) {
      setJumpTarget(current => ({
        offset: result.offset,
        length: result.length,
        token: (current?.token ?? 0) + 1,
      }));
    }
  }, [searchMode, searchQuery, snapshot]);

  const cancelSearch = useCallback(() => {
    setActiveSearch(null);
    setSearchIndex(0);
    setJumpTarget(null);
  }, []);

  const moveSearch = useCallback((direction: -1 | 1) => {
    const count = searchOutcome.results.length;
    if (count === 0) {
      return;
    }
    const nextIndex = (searchIndex + direction + count) % count;
    jumpToSearchResult(nextIndex);
  }, [jumpToSearchResult, searchIndex, searchOutcome.results.length]);

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
                <span>{snapshot ? t('bytes', { count: (snapshot.page?.totalBytes ?? snapshot.cells.length).toLocaleString() }) : t('loading')}</span>
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
          {searchOpen ? (
            <SearchPanel
              mode={searchMode}
              query={searchQuery}
              active={activeSearch !== null}
              resultCount={searchOutcome.results.length}
              activeIndex={searchOutcome.results.length > 0 ? searchIndex : -1}
              error={activeSearch ? searchOutcome.error : undefined}
              onModeChange={mode => {
                setSearchMode(mode);
                setActiveSearch(null);
              }}
              onQueryChange={query => {
                setSearchQuery(query);
                setActiveSearch(null);
              }}
              onClose={() => {
                setSearchOpen(false);
                cancelSearch();
              }}
              onPrevious={() => moveSearch(-1)}
              onNext={() => moveSearch(1)}
              onSubmit={activeSearch ? cancelSearch : startSearch}
            />
          ) : null}
          <div className="editor-panel-stack">
            <DiagnosticsStrip
              result={snapshot.diagnostics}
              onJump={event => setJumpTarget(current => ({
                offset: event.offset,
                length: event.length,
                token: (current?.token ?? 0) + 1,
              }))}
            />
            {snapshot.page?.mode === 'paged' ? <PageNavigator snapshot={snapshot} /> : null}
          </div>
          <HexGrid
            snapshot={snapshot}
            jumpTarget={jumpTarget}
            condenseMode={viewSettings.condenseMode}
            showRuler={viewSettings.showRuler}
            onSearchRequested={openSearch}
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

function SearchPanel({
  mode,
  query,
  active,
  resultCount,
  activeIndex,
  error,
  onModeChange,
  onQueryChange,
  onClose,
  onPrevious,
  onNext,
  onSubmit,
}: {
  mode: SearchMode;
  query: string;
  active: boolean;
  resultCount: number;
  activeIndex: number;
  error?: 'empty' | 'invalidHex' | 'invalidPattern';
  onModeChange: (mode: SearchMode) => void;
  onQueryChange: (query: string) => void;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const status = active
    ? error
      ? searchErrorMessage(error)
      : resultCount > 0
        ? t('searchResultStatus', { current: activeIndex + 1, total: resultCount })
        : t('searchNoResults')
    : query.trim()
      ? t('searchPending')
      : t('searchReady');

  return (
    <aside className="search-panel" aria-label={t('searchPanelLabel')}>
      <div className="search-controls">
        <div className="segmented-control" role="tablist" aria-label={t('searchMode')}>
          <button
            className={mode === 'unicode' ? 'segment-active' : ''}
            type="button"
            role="tab"
            aria-selected={mode === 'unicode'}
            disabled={active}
            onClick={() => onModeChange('unicode')}
          >
            {t('searchUnicode')}
          </button>
          <button
            className={mode === 'hex' ? 'segment-active' : ''}
            type="button"
            role="tab"
            aria-selected={mode === 'hex'}
            disabled={active}
            onClick={() => onModeChange('hex')}
          >
            {t('searchHex')}
          </button>
        </div>
        <button className="icon-button icon-button-secondary search-close" type="button" title={t('closeSearch')} aria-label={t('closeSearch')} onClick={onClose}>
          <SvgIcon name="close" />
        </button>
      </div>
      <div className="search-input-row">
        <input
          ref={inputRef}
          value={query}
          disabled={active}
          onChange={event => onQueryChange(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              if (event.shiftKey) {
                onPrevious();
              } else if (active && resultCount > 0) {
                onNext();
              } else {
                onSubmit();
              }
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              onClose();
            }
          }}
          placeholder={mode === 'unicode' ? t('searchUnicodePlaceholder') : t('searchHexPlaceholder')}
          aria-label={mode === 'unicode' ? t('searchUnicode') : t('searchHex')}
        />
        <button
          className={['icon-button', active ? 'icon-button-secondary' : 'icon-button-primary'].join(' ')}
          type="button"
          title={active ? t('cancelSearch') : t('runSearch')}
          aria-label={active ? t('cancelSearch') : t('runSearch')}
          disabled={!active && !query.trim()}
          onClick={onSubmit}
        >
          <SvgIcon name={active ? 'cancel' : 'search'} />
        </button>
        <button className="icon-button icon-button-secondary" type="button" title={t('previousSearchResult')} aria-label={t('previousSearchResult')} disabled={!active || resultCount === 0} onClick={onPrevious}>
          <SvgIcon name="chevron-up" />
        </button>
        <button className="icon-button icon-button-secondary" type="button" title={t('nextSearchResult')} aria-label={t('nextSearchResult')} disabled={!active || resultCount === 0} onClick={onNext}>
          <SvgIcon name="chevron-down" />
        </button>
      </div>
      <div className={['search-status', error ? 'search-status-error' : ''].filter(Boolean).join(' ')} aria-live="polite">
        {status}
      </div>
    </aside>
  );
}

function searchErrorMessage(error: 'empty' | 'invalidHex' | 'invalidPattern'): string {
  if (error === 'invalidHex') {
    return t('searchInvalidHex');
  }
  if (error === 'invalidPattern') {
    return t('searchInvalidPattern');
  }
  return t('searchReady');
}

function PageNavigator({ snapshot }: { snapshot: EditorSnapshot }) {
  const page = snapshot.page;
  if (!page || page.mode !== 'paged') {
    return null;
  }

  const canGoPrevious = page.pageIndex > 0;
  const canGoNext = page.pageIndex < page.pageCount - 1;
  const goToPage = (pageIndex: number) => vscode.postMessage({ type: 'goToPage', pageIndex });
  const pageStart = page.pageStartOffset.toString(16).toUpperCase().padStart(6, '0');
  const pageEnd = Math.max(page.pageStartOffset, page.pageEndOffset - 1).toString(16).toUpperCase().padStart(6, '0');

  return (
    <nav className="page-nav" aria-label={t('pageNavigation')}>
      <button
        className="icon-button icon-button-secondary page-nav-button"
        type="button"
        title={t('previousPage')}
        aria-label={t('previousPage')}
        disabled={!canGoPrevious}
        onClick={() => goToPage(page.pageIndex - 1)}
      >
        <SvgIcon name="chevron-left" />
      </button>
      <span className="page-nav-status">
        {t('pageStatus', { current: page.pageIndex + 1, total: page.pageCount })}
      </span>
      <span className="page-nav-range">
        {t('pageByteRange', { start: pageStart, end: pageEnd })}
      </span>
      <button
        className="icon-button icon-button-secondary page-nav-button"
        type="button"
        title={t('nextPage')}
        aria-label={t('nextPage')}
        disabled={!canGoNext}
        onClick={() => goToPage(page.pageIndex + 1)}
      >
        <SvgIcon name="chevron-right" />
      </button>
    </nav>
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

type SvgIconName = 'cancel' | 'chevron-down' | 'chevron-up' | 'chevron-left' | 'chevron-right' | 'close' | 'refresh' | 'revert' | 'save' | 'search';

function SvgIcon({ name }: { name: SvgIconName }) {
  return (
    <svg className="svg-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {name === 'chevron-down' ? <path d="M6 9l6 6 6-6" /> : null}
      {name === 'chevron-up' ? <path d="M6 15l6-6 6 6" /> : null}
      {name === 'chevron-left' ? <path d="M15 6l-6 6 6 6" /> : null}
      {name === 'chevron-right' ? <path d="M9 6l6 6-6 6" /> : null}
      {name === 'cancel' ? (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M9 9l6 6" />
          <path d="M15 9l-6 6" />
        </>
      ) : null}
      {name === 'close' ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
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
      {name === 'search' ? (
        <>
          <circle cx="11" cy="11" r="6" />
          <path d="M16 16l4 4" />
        </>
      ) : null}
    </svg>
  );
}
