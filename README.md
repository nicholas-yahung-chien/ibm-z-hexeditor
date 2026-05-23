# IBM Z HEX ON Editor

VS Code extension prototype for ISPF-style `HEX ON` editing.

The editor opens the current text document in a custom webview, renders the original text as read-only Unicode, and exposes editable high/low hex-nibble rows generated through an IBM Z code page. The MVP focuses on UTF-8 text documents and IBM-937 bytes, including SO/SI diagnostics for EBCDIC DBCS runs.

## MVP Scope

- Command: `IBM Z Hex Editor: Open HEX ON`
- Source text: UTF-8 text documents opened in VS Code, with an explicit source-encoding selection step for non-UTF-8 files
- Hex code page: IBM-937
- Editing surface: read-only character row plus editable high/low nibble rows
- Save behavior: decode edited IBM-937 bytes back to Unicode text and write the active file, then reopen it in the default text editor

## Source Encoding Flow

VS Code exposes text documents to extensions as decoded Unicode strings, while the file on disk still has a concrete byte encoding. This extension therefore treats source encoding as part of the opening flow:

1. Resolve the active local file from the text editor or active file tab.
2. Save the active file first if it is dirty.
3. Show a source-encoding picker:
   - use the encoding VS Code reports for the current `TextDocument`
   - force UTF-8
   - choose a common VS Code encoding id such as `cp950`, `big5hkscs`, `shiftjis`, or `gbk`
   - enter another VS Code encoding id manually
4. Read the file's raw bytes from disk and decode them with the selected source encoding.
5. Convert the decoded Unicode text to IBM-937 bytes for HEX ON editing.
6. On save, decode the edited IBM-937 bytes back to Unicode text, then encode the file with the selected source encoding.

The MVP is primarily validated with UTF-8 source files. Non-UTF-8 source encodings are allowed after confirmation, but should be tested carefully because wrong source-encoding selection can produce replacement characters before the IBM-937 conversion stage.

## Development

```sh
npm install
npm run compile
npm test
```

Run the extension from VS Code's Extension Development Host after compiling.
