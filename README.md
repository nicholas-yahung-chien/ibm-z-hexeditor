# IBM Z HEX ON Editor

![IBM Z HEX ON Editor icon](images/icon.png)

IBM Z HEX ON Editor adds an ISPF-style byte editor to VS Code. Open a local file, choose the actual encoding of the bytes on disk, edit the high and low hex nibbles directly, and save the updated raw bytes back to the file.

The current MVP is focused on IBM-937 and UTF-8 workflows. IBM-937 files get SO/SI structure diagnostics for DBCS data so you can inspect, repair, and verify shift-byte problems without leaving VS Code.

## What You Can Do

- Open a local file in a HEX ON custom editor.
- View raw file bytes as editable high/low hex-nibble rows.
- See a read-only character preview decoded with the encoding you choose.
- Edit bytes by replacing nibbles, inserting `00`, or deleting bytes.
- Inspect IBM-937 SO/SI structure and DBCS ambiguity warnings.
- Jump from diagnostics to the exact byte location.
- Save edited bytes back to disk, then return to the default VS Code editor.
- Enable Condense Mode to show more bytes per row.

## Screenshots

Screenshots are planned for the MVP release package. The capture list and filenames are tracked in [docs/screenshots.md](docs/screenshots.md).

## Installation

### Install From VSIX

Build the package:

```sh
npm install
npm run package:vsix
```

Install `dist/ibm-z-hex-on-editor.vsix` from VS Code:

1. Open the Extensions view.
2. Run `Extensions: Install from VSIX...`.
3. Select `dist/ibm-z-hex-on-editor.vsix`.
4. Reload VS Code if prompted.

For repeatable validation with a clean VS Code profile, see [docs/acceptance-checklist.md](docs/acceptance-checklist.md).

### Run From Source

```sh
npm install
npm run compile
```

Open this repository in VS Code and press `F5` to launch an Extension Development Host.

## Basic Use

1. Open a local file in VS Code.
2. Run `IBM Z Hex Editor: Open HEX ON` from the Command Palette, editor title menu, or editor context menu.
3. If the current file has unsaved changes, save it first.
4. Choose the actual file-content encoding of the bytes on disk.
5. Edit bytes in the HEX ON view.
6. Press `Ctrl+S` or click `Save`.

Choose `IBM-937` when the file bytes are IBM-937, even if VS Code previously displayed the file through another text encoding.

## Settings

- `ibmZHexEditor.maxFileSizeKb`: maximum local file size, in KB, that can be opened in the HEX ON editor.
- `ibmZHexEditor.condenseMode`: show a denser grid with narrower byte cells, hidden offsets, and no grid edge padding.

## Documentation

- [User guide](docs/user-guide.md)
- [IBM-937 diagnostics rules](docs/diagnostics.md)
- [Acceptance checklist](docs/acceptance-checklist.md)
- [Icon design notes](docs/icon-design.md)
- [Screenshot plan](docs/screenshots.md)
- [Change log](CHANGELOG.md)
- [Roadmap](docs/roadmap.md)

## Current Limits

- Local files only.
- IBM-937 has the most complete diagnostics. Other encodings are currently preview/edit flows.
- Additional IBM EBCDIC DBCS code pages are planned after the IBM-937 architecture is stabilized.
- Localization is planned near the end of the MVP cycle after UI text and diagnostics wording settle.

## Development Verification

```sh
npm run type-check
npm test
npm run package:vsix
```
