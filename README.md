# IBM Z HEX ON Editor

VS Code extension prototype for ISPF-style `HEX ON` editing.

The editor opens the current file in a custom webview, edits the file's raw bytes through high/low hex-nibble rows, and renders a read-only character preview using the file-content encoding selected by the user. The MVP focuses on UTF-8 and IBM-937 preview, including SO/SI diagnostics for EBCDIC DBCS runs.

## MVP Scope

- Command: `IBM Z Hex Editor: Open HEX ON`
- Source bytes: local file bytes read directly from disk
- File-content encoding preview: UTF-8 or IBM-937 in the first byte-first milestone
- Editing surface: read-only character row plus editable high/low nibble rows
- Raw byte editing: replace nibbles, insert bytes, delete bytes
- IBM-937 diagnostics: SO/SI structure checks and conservative DBCS ambiguity warnings
- Save behavior: write the edited raw bytes back to the file, then reopen it in the default text editor
- Condense Mode: optional denser grid layout for fixed-format files

## File Encoding Flow

VS Code exposes text documents to extensions as decoded Unicode strings, while the file on disk still has concrete bytes. This extension therefore treats the selected encoding as a preview/diagnostic choice, not as the source of truth for the hex rows:

1. Resolve the active local file from the text editor or active file tab.
2. Save the active file first if it is dirty.
3. Show a file-content encoding picker:
   - use the encoding VS Code reports for the current `TextDocument`
   - preview as IBM-937
   - force UTF-8
   - choose a common VS Code encoding id such as `cp950`, `big5hkscs`, `shiftjis`, or `gbk`
   - enter another VS Code encoding id manually
4. Read the file's raw bytes from disk.
5. Display those raw bytes in the hex rows.
6. Render the read-only character preview using the selected encoding.
7. On save, write the edited raw bytes back to disk without a Unicode roundtrip.

The IBM-937 path is intended for opening existing EBCDIC byte streams directly, including files where SO/SI structure needs inspection or repair.

## Usage

See [docs/user-guide.md](docs/user-guide.md) for the current MVP workflow, keyboard editing behavior, save/reload/revert behavior, and Condense Mode setting.

For IBM-937 SO/SI and DBCS rules, see [docs/diagnostics.md](docs/diagnostics.md).

For planned work, including additional IBM EBCDIC DBCS code pages, see [docs/roadmap.md](docs/roadmap.md).

## Settings

- `ibmZHexEditor.maxFileSizeKb`: maximum local file size for the MVP custom editor.
- `ibmZHexEditor.condenseMode`: enable a denser grid with narrower byte cells and hidden offsets.

## Development

```sh
npm install
npm run compile
npm test
npm run package:vsix
```

Run the extension from VS Code's Extension Development Host after compiling.

Useful verification commands:

```sh
npm run type-check
npm test
npm run compile
npm run package:vsix
```
