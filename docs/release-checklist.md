# Release Checklist

Use this checklist to record a complete release-candidate validation pass before publishing or sharing a VSIX outside the immediate development loop.

## Release Candidate

- Version: `0.2.0`
- Package: `dist/ibm-z-hex-on-editor.vsix`
- Validation baseline commit: `1016ff7`
- Validation date: `2026-06-05`
- Validator: Nicholas Chien
- VS Code-compatible host: IBM Bob `1.109.5+bob1.0.2`, commit `473fcbe9e52a0216936d3c384820ebb51fb5cfc2`, x64
- Host CLI: `C:\Users\NicholasChien\Documents\IBM Bob\bin\bobide.cmd`
- Operating system: Microsoft Windows 11 Enterprise 10.0.26200
- Node.js version: `v22.16.0`

## Build Verification

Run from the repository root:

```powershell
npm run type-check
npm test
npm run package:vsix
```

Expected:

- [x] TypeScript check passes.
- [x] Unit and fixture regression tests pass.
- [x] VSIX package is created at `dist/ibm-z-hex-on-editor.vsix`.
- [x] Package output includes `README.md`, `CHANGELOG.md`, `images/icon.png`, and `images/screenshots/`.
- [x] Package output excludes `test/`, `test/fixtures/`, `.tmp/`, logs, scripts, and source files.
- [x] Package output includes only the required Codicons runtime assets under `dist/codicons`.

## VSIX Installation

1. Install `dist/ibm-z-hex-on-editor.vsix` into a clean VS Code window.
2. Reload VS Code when prompted.
3. Confirm the extension appears as IBM Z HEX ON Editor.

Expected:

- [x] Extension installs without errors.
- [x] Icon appears in the extension details view.
- [x] Command Palette includes `IBM Z Hex Editor: Open HEX ON`.

## Functional Acceptance

Run the full scenario list in [acceptance-checklist.md](acceptance-checklist.md).

Summary:

- [x] Encoding picker behavior accepted.
- [x] UTF-8/raw byte editing accepted.
- [x] IBM SBCS preview accepted for IBM-037, IBM-500, IBM-1047, and IBM-1140.
- [x] IBM DBCS preview and SO/SI diagnostics accepted for IBM-930, IBM-933, IBM-935, IBM-937, IBM-939, IBM-1364, IBM-1371, IBM-1388, IBM-1390, and IBM-1399.
- [x] Insert/delete byte editing accepted.
- [x] Save/reload/revert flows accepted.
- [x] Save confirmation for structural DBCS issues accepted.
- [x] Condense Mode accepted.
- [x] Header collapse accepted.
- [x] Column ruler accepted.
- [x] User-configurable DBCS ambiguous exclusions accepted.
- [x] Unsupported IBM code-page warning accepted.
- [x] Invalid non-IBM custom encoding rejection accepted.
- [x] Paged rendering accepted with configurable page limits of 30, 50, and 100 logical lines.
- [x] IBM-937 1200-line stress fixture accepted for manual open and navigation testing.
- [x] `Ctrl+F` search accepted for Unicode and Hex modes.
- [x] Unicode wildcard search accepted with line-bounded `*`, leading/trailing wildcard range behavior, and escaped wildcard literals.
- [x] Search result navigation and cancel-search behavior accepted.
- [x] Optional performance logging accepted and remains disabled by default.
- [x] Localized extension, settings, prompt, and webview strings accepted for first-pass validation, with reload-window guidance documented.
- [x] Supported fixed-length `zowe-ds:` members save through HEX ON's primary direct-binary path without the generic Zowe Explorer "data loss" warning.

## Release Assets

- [x] README screenshots render correctly on GitHub.
- [x] `docs/marketplace.md` copy has been reviewed for release-candidate use.
- [x] Screenshot set is complete:
  - [x] `encoding-picker.png`
  - [x] `hex-on-standard.png`
  - [x] `diagnostics-expanded.png`
  - [x] `sbcs-preview.png`
  - [x] `condense-mode.png`
  - [x] `unsupported-ibm-encoding.png`
  - [x] `save-confirmation.png`
- [x] `CHANGELOG.md` reflects the release contents.
- [ ] Product naming, legal notices, icon usage, and generated mapping table attribution are ready for product-team review.

## Known Limits For 0.2.0

- Local files and Zowe Explorer `zowe-ds` / `zowe-uss` resources are supported.
- Supported fixed-length `zowe-ds:` members opened from the Zowe tree now prefer direct binary save, but other Zowe resources may still use fallback behavior.
- Supported IBM EBCDIC SBCS profiles provide preview but no SO/SI diagnostics.
- Supported IBM EBCDIC DBCS profiles provide preview and SO/SI diagnostics.
- Unsupported IBM-style code page ids can still be edited as raw bytes, but use generic preview, row splitting, and diagnostics behavior.
- Unknown custom encoding names that are not supported VS Code encoding ids or IBM-style code page ids are rejected.
- First-pass localization exists for Traditional Chinese, Simplified Chinese, Japanese, Korean, and German, but product localization review is still recommended before external publication.
- Code page mapping tables are bundled into the VSIX so the extension works offline after installation. Future lazy loading must keep the complete mapping data inside the single VSIX package.
- `dist/extension.js` is large because mapping tables are bundled for complete offline functionality.

## Sign-Off Notes

Decision:

- [x] Ready to share internally for product-team review.
- [ ] Ready to publish externally.
- [ ] Needs fixes before publish/share.

Notes:

```text
Manual validation accepted across the MVP feature set using IBM Bob 1.109.5+bob1.0.2, including direct-binary save for supported fixed-length Zowe data set members.
External publication remains pending product-team review for naming, legal notices, icon usage, and generated mapping table attribution.
```
