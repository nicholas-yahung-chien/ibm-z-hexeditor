# User Guide

This guide describes the current MVP workflow for the IBM Z HEX ON Editor.

## Install

Build and install the local VSIX:

```sh
npm install
npm run package:vsix
```

Then in VS Code, run `Extensions: Install from VSIX...` and choose `dist/ibm-z-hex-on-editor.vsix`.

If localized settings text does not update immediately after installing or updating a VSIX, run `Developer: Reload Window` or restart VS Code / IBM Bob.

## Open HEX ON

1. Open a local file in VS Code.
2. Run `IBM Z Hex Editor: Open HEX ON` from the Command Palette, editor title menu, or editor context menu.
3. If the current editor has unsaved changes, save it first. The HEX ON editor reads bytes from disk.
4. Choose the actual file-content encoding used by the bytes on disk.

The encoding picker may show the encoding reported by VS Code for the current text document. Treat that as a reference only. If the file bytes are actually IBM EBCDIC, choose the matching IBM code page even when VS Code displayed the file as UTF-8 or another encoding.

Encoding choices include a short language or encoding-family description, such as `Korean EBCDIC DBCS / 한국어` or `Traditional Chinese Big5 / 繁體中文`, to make the actual bytes-on-disk choice easier to distinguish.

## Encoding Choices

The editor is byte-first:

- hex rows always show the raw file bytes;
- the read-only character preview is decoded from those bytes using the selected encoding;
- IBM-037, IBM-500, IBM-1047, and IBM-1140 enable SBCS EBCDIC preview;
- IBM-930, IBM-933, IBM-935, IBM-937, IBM-939, IBM-1364, IBM-1371, IBM-1388, IBM-1390, and IBM-1399 enable SO/SI and DBCS diagnostics;
- save writes the edited raw bytes back to disk without converting through Unicode text.

If you choose `Enter another encoding...` and enter an IBM-style code page id that is not yet supported, such as `cp273`, the extension warns that HEX ON can still edit raw bytes but preview, row splitting, and diagnostics will use generic fallback behavior.

If you enter a name that is neither a supported VS Code text encoding id nor an IBM-style code page id, such as `dummy105`, the extension rejects it instead of opening through VS Code's internal decode fallback.

The MVP has focused validation for:

- `ibm937`
- `ibm37`
- `ibm500`
- `ibm1047`
- `ibm1140`
- `ibm930`
- `ibm933`
- `ibm935`
- `ibm939`
- `ibm1364`
- `ibm1371`
- `ibm1388`
- `ibm1390`
- `ibm1399`
- `utf8`
- common VS Code encoding ids such as `cp950`, `big5hkscs`, `shiftjis`, and `gbk`

Known VS Code encoding ids can be entered manually. Unknown custom names are rejected so the editor header does not display an encoding id that VS Code silently interpreted through fallback behavior.

## Editor Layout

Each byte is shown as two editable hex nibbles:

- top row: high nibble
- bottom row: low nibble

The character row above the hex nibbles is read-only. It shows the decoded preview for the selected file-content encoding.

When a byte belongs to a multi-byte preview character, the preview character spans the corresponding byte cells.

The header can be collapsed from the editor toolbar to give the byte grid more vertical space. Collapsing the header keeps a compact file/status row and an expand control available.

## Keyboard Editing

- Arrow keys move the active nibble.
- `0` to `9` and `A` to `F` replace the active nibble.
- `Insert` inserts byte `0x00` at the active byte position.
- `Delete` or `Backspace` deletes the active byte.
- `Ctrl+S` saves through VS Code.

Diagnostics and the preview update as the raw bytes change.

## Search

Press `Ctrl+F` inside the HEX ON editor to open the search panel. The shortcut is handled by the editor, so it will not replace the active hex nibble with `F`.

Search does not run while you are typing. Enter a query and press the search button to search the current snapshot. During result navigation, the input and mode controls are locked; press the cancel-search button to unlock them and edit the query.

Search has two modes:

- Unicode: searches the current snapshot's decoded preview text. `.` matches one character, `*` matches any number of characters inside the same editor line, and `\.` or `\*` searches for literal wildcard characters. A leading `*` extends the match to the current editor-line start, a trailing `*` extends it to the current editor-line end, and wildcard matches never cross editor lines.
- Hex: searches the current snapshot's raw bytes. Separate each byte with a space, for example `A6 4F`, `0xA6 0x4F`, or mixed forms such as `A6 0x4F`. Unseparated multi-byte input such as `A64F` is rejected.

Use the previous and next buttons to move through matches. In paged mode, search applies to the current page snapshot.

## Diagnostics Panel

For supported IBM EBCDIC DBCS files, the diagnostics strip summarizes SO/SI structure and DBCS candidates. Supported SBCS-only EBCDIC files do not show DBCS diagnostics.

- `DBCS pair(s)` counts confirmed DBCS pairs inside explicit `SO ... SI` mode.
- `warning(s)` counts non-blocking warnings such as `DBCS ambiguous`.
- `DBCS issue(s)` counts structural problems such as missing or unmatched shift bytes.

Click the diagnostics strip to expand details. Category pills can be selected to filter the displayed locations. Location buttons jump the editor to the corresponding byte.

See [diagnostics.md](diagnostics.md) for the exact rule definitions.

Important diagnostic interpretation notes:

- `DBCS ambiguous` is a warning, not a save-blocking structural problem.
- When a likely missing `SO` is inferred, the editor may back the problem location up to the start of a pending ambiguous DBCS run.
- Bytes after that inferred missing `SO` can be highlighted as `DBCS` to show the repaired interpretation path.
- Custom `DBCS_AMBIGUOUS` exclusions replace the built-in defaults when enabled.

## Save, Reload, and Revert

`Save`
: Writes the current raw bytes to disk. If IBM DBCS structural problems exist, the extension asks for confirmation before saving. After a normal save, VS Code reopens the file in the default editor.

`Reload`
: Rereads the file bytes from disk. If the HEX ON editor has unsaved edits, the extension asks before discarding them.

`Revert`
: Uses VS Code's revert flow to discard unsaved HEX ON edits.

## Condense Mode

The setting `ibmZHexEditor.condenseMode` enables a denser editor view:

- byte cells become narrower;
- byte offsets are hidden;
- the grid edge padding is removed;
- header and diagnostics details keep internal padding for readability.

This mode is intended for wide fixed-format files where showing more bytes per row matters more than row labels.

## Column Ruler

The setting `ibmZHexEditor.showRuler` displays a column ruler above the byte grid. The ruler marks every fifth byte column with `+` and every tenth byte column with a digit, for example `----+----1----+----2`.

The ruler uses the current file's longest logical line up to 100 byte columns, and aligns to the same byte cell width as the grid.

## Paged Rendering

The setting `ibmZHexEditor.renderMode` can render the full file in one view or render one page at a time. In paged mode, diagnostics are calculated for the current page only.

The setting `ibmZHexEditor.pageLineLimit` controls the maximum logical lines per page. The default is `30`, with `50` and `100` also available. Files without explicit line breaks use 100 bytes as one logical line, so those choices map to 3000, 5000, and 10000 bytes per page.

## Performance Logging

The setting `ibmZHexEditor.performanceLogging` writes timing logs to the `IBM Z HEX ON Performance` output channel. It is disabled by default and is intended for troubleshooting large-file open, snapshot, transport, and webview rendering time.

## DBCS Ambiguous Exclusions

By default, the diagnostics suppress noisy `DBCS_AMBIGUOUS` warnings for common SBCS filler pairs such as EBCDIC spaces and repeated COBOL asterisks.

To customize this behavior, enable `ibmZHexEditor.dbcsAmbiguousExclusionsEnabled`. When it is enabled and no custom list exists yet, the extension writes the default rules into user settings JSON so they can be edited:

```json
"ibmZHexEditor.dbcsAmbiguousExclusionsEnabled": true,
"ibmZHexEditor.dbcsAmbiguousExclusions": [
  { "bytes": "40 40", "label": "EBCDIC spaces" },
  { "bytes": "5C 5C", "label": "COBOL repeated asterisks" }
]
```

The `bytes` value accepts `40 40`, `0x40 0x40`, or `4040`. Invalid entries are ignored and reported with a warning.

When custom exclusions are enabled, the custom list replaces the built-in defaults. Keep `40 40` or `5C 5C` in the list if you still want those pairs suppressed. Set the list to `[]` to intentionally use no ambiguous exclusions.

## Current Limits

- The extension currently supports local files only.
- Files larger than `ibmZHexEditor.maxFileSizeKb` are blocked by the MVP size guard.
- IBM-037, IBM-500, IBM-1047, and IBM-1140 have SBCS preview support but no DBCS diagnostics.
- IBM-930, IBM-933, IBM-935, IBM-937, IBM-939, IBM-1364, IBM-1371, IBM-1388, IBM-1390, and IBM-1399 have SO/SI DBCS diagnostics.
