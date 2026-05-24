const messages = {
  appTitle: 'IBM Z HEX ON Editor',
  encodingFallback: 'encoding',
  loading: 'loading',
  waitingForEditorData: 'Waiting for editor data...',
  saved: 'Saved',
  modified: 'Modified',
  ready: 'Ready',
  rawBytes: 'raw bytes',
  bytes: '{count} bytes',
  editingHint: 'Arrows move, 0-9/A-F edits, Ins inserts 00, Del/Backspace deletes, Ctrl+S saves',
  showHeader: 'Show header',
  hideHeader: 'Hide header',
  fileActions: 'File actions',
  reload: 'Reload',
  revert: 'Revert',
  save: 'Save',
  diagnosticsStructureValid: 'SO/SI structure valid',
  diagnosticsIssueCount: '{count} DBCS issue(s)',
  diagnosticsPairCount: '{count} DBCS pair(s)',
  diagnosticsWarningCount: '{count} warning(s)',
  diagnosticNavigation: 'Diagnostic navigation',
  diagnosticCategoryCounts: 'Diagnostic category counts',
  previous: 'Previous',
  next: 'Next',
  clearFilter: 'Clear filter',
  diagnosticsEmptyPosition: '0 / 0',
  diagnosticsPosition: '{current} / {total}',
  diagnosticsInactivePosition: '- / {total}',
  diagnosticsMore: '+{count} more',
  hexGridLabel: '{encoding} hex editor grid',
  columnRulerLabel: 'Column ruler, 1 to {count}',
};

type MessageKey = keyof typeof messages;
type MessageArgs = Record<string, string | number>;

export function t(key: MessageKey, args: MessageArgs = {}): string {
  return messages[key].replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = args[name];
    return value === undefined ? match : String(value);
  });
}
