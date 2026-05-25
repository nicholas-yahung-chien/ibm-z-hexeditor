# Marketplace Listing Draft

This page collects copy and release assets for a VS Code Marketplace listing or GitHub release page.

## Short Description

ISPF-style HEX ON byte editing for IBM Z files, with IBM EBCDIC preview and DBCS SO/SI diagnostics.

## Long Description

IBM Z HEX ON Editor adds an ISPF-style byte editor to VS Code. Open a local file, choose the actual encoding of the bytes on disk, inspect the decoded character preview, edit high and low hex nibbles directly, and save the updated raw bytes back to the file.

The editor is byte-first. It reads raw file bytes from disk and writes raw file bytes back to disk, so it can be used even when VS Code's text editor would display the file with the wrong encoding.

Supported IBM EBCDIC SBCS profiles provide code-page-aware preview for common host files. Supported IBM EBCDIC DBCS profiles also include SO/SI structure diagnostics, confirmed DBCS pair counts, and conservative DBCS ambiguity warnings to help identify shift-byte problems before saving.

## Feature Bullets

- Open local files in a custom HEX ON editor.
- Edit raw bytes as high and low hex nibbles.
- Preview bytes using selected UTF-8, IBM EBCDIC SBCS, or IBM EBCDIC DBCS encodings.
- Choose the actual bytes-on-disk encoding instead of relying on the VS Code-reported text encoding.
- Inspect SO/SI structure for supported IBM EBCDIC DBCS files.
- Jump from diagnostics to exact byte locations.
- Insert and delete bytes directly from the hex grid.
- Use Condense Mode and an optional column ruler for fixed-format source files.
- Configure DBCS ambiguous byte-pair exclusions from VS Code user settings JSON.
- Warn before using unsupported manually entered IBM code page ids.

## Supported Code Pages

SBCS preview:

- IBM-037
- IBM-500
- IBM-1047
- IBM-1140

DBCS preview and SO/SI diagnostics:

- IBM-930
- IBM-933
- IBM-935
- IBM-937
- IBM-939
- IBM-1364
- IBM-1371
- IBM-1388
- IBM-1390
- IBM-1399

Other manually entered encodings may still be used for raw byte editing. Unsupported IBM-style code page ids show a warning and use generic preview behavior.

## Screenshot Order

Use the filenames and capture instructions in [screenshots.md](screenshots.md).

The webview-only screenshots can be regenerated with `npm run capture:screenshots`. The VS Code encoding picker and modal screenshots are captured manually from an Extension Development Host or VSIX-installed extension.

Recommended Marketplace order:

1. `encoding-picker.png`
2. `hex-on-standard.png`
3. `diagnostics-expanded.png`
4. `sbcs-preview.png`
5. `condense-mode.png`
6. `unsupported-ibm-encoding.png`
7. `save-confirmation.png`

## Release Asset Checklist

- `dist/ibm-z-hex-on-editor.vsix`
- `README.md`
- `CHANGELOG.md`
- `docs/release-notes-0.1.0.md`
- `images/icon.png`
- selected screenshots under `images/screenshots/`
- acceptance notes from [acceptance-checklist.md](acceptance-checklist.md)
- release-candidate sign-off from [release-checklist.md](release-checklist.md)

## Suggested Tags

- IBM Z
- z/OS
- EBCDIC
- DBCS
- HEX ON
- hex editor
- mainframe

## Pre-Publish Checks

```sh
npm run type-check
npm test
npm run package:vsix
```

Before publishing outside the team, confirm product naming, legal notices, and generated mapping table source attribution with the owning product process.
