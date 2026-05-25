# Release Checklist

Use this checklist to record a complete release-candidate validation pass before publishing or sharing a VSIX outside the immediate development loop.

## Release Candidate

- Version: `0.1.0`
- Package: `dist/ibm-z-hex-on-editor.vsix`
- Repository commit: `788591c`
- Validation date: `2026-05-25`
- Validator: Pending manual sign-off
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

## VSIX Installation

1. Install `dist/ibm-z-hex-on-editor.vsix` into a clean VS Code window.
2. Reload VS Code when prompted.
3. Confirm the extension appears as IBM Z HEX ON Editor.

Expected:

- [ ] Extension installs without errors.
- [ ] Icon appears in the extension details view.
- [ ] Command Palette includes `IBM Z Hex Editor: Open HEX ON`.

## Functional Acceptance

Run the full scenario list in [acceptance-checklist.md](acceptance-checklist.md).

Summary:

- [ ] Encoding picker behavior accepted.
- [ ] UTF-8/raw byte editing accepted.
- [ ] IBM SBCS preview accepted for IBM-037, IBM-500, IBM-1047, and IBM-1140.
- [ ] IBM DBCS preview and SO/SI diagnostics accepted for IBM-930, IBM-933, IBM-935, IBM-937, IBM-939, IBM-1364, IBM-1371, IBM-1388, IBM-1390, and IBM-1399.
- [ ] Insert/delete byte editing accepted.
- [ ] Save/reload/revert flows accepted.
- [ ] Save confirmation for structural DBCS issues accepted.
- [ ] Condense Mode accepted.
- [ ] Header collapse accepted.
- [ ] Column ruler accepted.
- [ ] User-configurable DBCS ambiguous exclusions accepted.
- [ ] Unsupported IBM code-page warning accepted.

## Release Assets

- [ ] README screenshots render correctly on GitHub.
- [ ] `docs/marketplace.md` copy has been reviewed.
- [ ] Screenshot set is complete:
  - [ ] `encoding-picker.png`
  - [ ] `hex-on-standard.png`
  - [ ] `diagnostics-expanded.png`
  - [ ] `sbcs-preview.png`
  - [ ] `condense-mode.png`
  - [ ] `unsupported-ibm-encoding.png`
  - [ ] `save-confirmation.png`
- [ ] `CHANGELOG.md` reflects the release contents.
- [ ] Product naming, legal notices, icon usage, and generated mapping table attribution are ready for product-team review.

## Known Limits For 0.1.0

- Local files only.
- Supported IBM EBCDIC SBCS profiles provide preview but no SO/SI diagnostics.
- Supported IBM EBCDIC DBCS profiles provide preview and SO/SI diagnostics.
- Unsupported IBM-style code page ids can still be edited as raw bytes, but use generic preview, row splitting, and diagnostics behavior.
- Full localization catalogs are planned after the MVP copy stabilizes.

## Sign-Off Notes

Decision:

- [ ] Ready to publish/share.
- [ ] Needs fixes before publish/share.

Notes:

```text

```
