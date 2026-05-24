# User Guide

This guide describes the current MVP workflow for the IBM Z HEX ON Editor.

## Install

Build and install the local VSIX:

```sh
npm install
npm run package:vsix
```

Then in VS Code, run `Extensions: Install from VSIX...` and choose `dist/ibm-z-hex-on-editor.vsix`.

## Open HEX ON

1. Open a local file in VS Code.
2. Run `IBM Z Hex Editor: Open HEX ON` from the Command Palette, editor title menu, or editor context menu.
3. If the current editor has unsaved changes, save it first. The HEX ON editor reads bytes from disk.
4. Choose the actual file-content encoding used by the bytes on disk.

The encoding picker may show the encoding reported by VS Code for the current text document. Treat that as a reference only. If the file bytes are actually IBM EBCDIC DBCS, choose the matching IBM code page even when VS Code displayed the file as UTF-8 or another encoding.

Encoding choices include a short language or encoding-family description, such as `Korean EBCDIC DBCS / 한국어` or `Traditional Chinese Big5 / 繁體中文`, to make the actual bytes-on-disk choice easier to distinguish.

## Encoding Choices

The editor is byte-first:

- hex rows always show the raw file bytes;
- the read-only character preview is decoded from those bytes using the selected encoding;
- IBM-930, IBM-933, IBM-935, IBM-937, and IBM-939 enable SO/SI and DBCS diagnostics;
- save writes the edited raw bytes back to disk without converting through Unicode text.

The MVP has focused validation for:

- `ibm937`
- `ibm930`
- `ibm933`
- `ibm935`
- `ibm939`
- `utf8`
- common VS Code encoding ids such as `cp950`, `big5hkscs`, `shiftjis`, and `gbk`

Other VS Code encoding ids can be entered manually.

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

## Diagnostics Panel

For supported IBM EBCDIC DBCS files, the diagnostics strip summarizes SO/SI structure and DBCS candidates.

- `DBCS pair(s)` counts confirmed DBCS pairs inside explicit `SO ... SI` mode.
- `warning(s)` counts non-blocking warnings such as `DBCS ambiguous`.
- `DBCS issue(s)` counts structural problems such as missing or unmatched shift bytes.

Click the diagnostics strip to expand details. Category pills can be selected to filter the displayed locations. Location buttons jump the editor to the corresponding byte.

See [diagnostics.md](diagnostics.md) for the exact rule definitions.

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

## DBCS Ambiguous Exclusions

By default, the diagnostics suppress noisy `DBCS_AMBIGUOUS` warnings for common SBCS filler pairs such as EBCDIC spaces and repeated COBOL asterisks.

To customize this behavior, enable `ibmZHexEditor.dbcsAmbiguousExclusionsEnabled`. When it is first enabled, the extension writes the default rules into user settings JSON so they can be edited:

```json
"ibmZHexEditor.dbcsAmbiguousExclusionsEnabled": true,
"ibmZHexEditor.dbcsAmbiguousExclusions": [
  { "bytes": "40 40", "label": "EBCDIC spaces" },
  { "bytes": "5C 5C", "label": "COBOL repeated asterisks" }
]
```

The `bytes` value accepts `40 40`, `0x40 0x40`, or `4040`. Invalid entries are ignored and reported with a warning.

## Current Limits

- The extension currently supports local files only.
- Files larger than `ibmZHexEditor.maxFileSizeKb` are blocked by the MVP size guard.
- IBM-930, IBM-933, IBM-935, IBM-937, and IBM-939 have SO/SI DBCS diagnostics. Other encodings are preview/edit flows only.
