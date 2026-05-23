# IBM Z HEX ON Editor

VS Code extension prototype for ISPF-style `HEX ON` editing.

The editor opens the current text document in a custom webview, renders the original text as read-only Unicode, and exposes editable high/low hex-nibble rows generated through an IBM Z code page. The MVP focuses on UTF-8 text documents and IBM-937 bytes, including SO/SI diagnostics for EBCDIC DBCS runs.

## MVP Scope

- Command: `IBM Z Hex Editor: Open HEX ON`
- Source text: UTF-8 text documents opened in VS Code
- Hex code page: IBM-937
- Editing surface: read-only character row plus editable high/low nibble rows
- Save behavior: decode edited IBM-937 bytes back to Unicode text and write the active file, then reopen it in the default text editor

## Development

```sh
npm install
npm run compile
npm test
```

Run the extension from VS Code's Extension Development Host after compiling.
