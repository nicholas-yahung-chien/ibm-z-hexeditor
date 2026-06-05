# Change Log

All notable changes to the IBM Z HEX ON Editor extension will be documented in this file.

## 0.2.0 - Safer Zowe Save Flow Milestone

### Added

- Added record-metadata inference for fixed-length `zowe-ds:` members so HEX ON can identify stable direct-binary save candidates.
- Added a primary direct-binary save path for supported Zowe data set members, plus focused unit coverage for save eligibility decisions.

### Changed

- Updated `saveCustomDocument()` to prefer direct binary writes for supported fixed-length `zowe-ds:` members before falling back to Zowe Explorer's standard save path.
- Reduced false-positive Zowe Explorer "data loss" warnings for validated fixed-length member save flows while preserving existing fallback behavior for unsupported cases.
- Refreshed release, Marketplace, and user-guide documentation to describe the current Zowe save behavior and rollout guidance.

## 0.1.5 - Search and Packaging Polish

### Added

- Added `Ctrl+F` search to the HEX ON editor, with Unicode and hex-byte modes.
- Added search-result navigation, cancel-search behavior, and locked search input while navigating results.
- Added Unicode wildcard search with `.` and `*`, escape support for `\.` and `\*`, line-bounded `*` behavior, and trailing-wildcard matches that extend to the current editor-line end.
- Added paged rendering with configurable page sizes of 30, 50, or 100 logical lines.
- Added optional performance timing logs for editor open, snapshot creation, message transport, and webview rendering.
- Added initial Zowe Explorer resource support for `zowe-ds:` and `zowe-uss:` resources without modifying Zowe Explorer or Z Open Editor.
- Added Zowe Explorer tree context-menu entry points that ask Zowe Explorer to reopen the selected resource in binary mode before HEX ON reads raw bytes.

### Changed

- Updated the in-editor operation hint to mention `Ctrl+F` search.
- Documented search behavior, paged rendering, performance logging, and localized-settings reload behavior.
- Refreshed package metadata versioning so local VSIX installs are easier to distinguish during validation.
- Reject unknown manually entered encoding names instead of relying on VS Code's internal decode fallback; unsupported IBM-style code page ids still require explicit confirmation before opening with generic behavior.
- Documented the Zowe resource launch path and warning behavior when opening from an already open Zowe text editor.

## 0.1.4 - Rounded Icon Tile

### Changed

- Updated the provided icon asset with rounded transparent corners to match the IBM Z extension family tile shape.
- Expanded DBCS diagnostics documentation for scan order, missing-SO backtracking, inferred DBCS highlighting, and save-confirmation behavior.

## 0.1.3 - Marketplace Icon Asset

### Changed

- Converted the provided icon into a 256x256 Marketplace PNG asset and generated a matching SVG wrapper from that PNG.

## 0.1.2 - Icon Family Alignment

### Changed

- Updated the extension icon to better align with the IBM Z VS Code extension family: dark rounded tile, blue/purple frame language, and a white `HEX` mark.

## 0.1.1 - Diagnostics Preview Refresh

### Changed

- Bumped the extension version so locally installed VSIX builds are easier to distinguish during validation.
- Diagnostic jump scrolling now behaves as a one-time action instead of reusing stale jump targets after byte edits.
- Inferred DBCS bytes after a backed-up missing SO are visually highlighted in the editor grid.
- DBCS ambiguous exclusion seeding now respects explicitly configured empty or invalid custom lists instead of overwriting them.

## 0.1.0 - MVP Preview

Initial MVP preview for local HEX ON byte editing in VS Code.

### Added

- ISPF-style HEX ON custom editor for local files.
- Raw byte editing with high and low hex-nibble rows.
- Read-only character preview based on the selected file-content encoding.
- Encoding picker that treats the VS Code-reported encoding as a reference and lets the user choose the actual bytes-on-disk encoding.
- IBM-037, IBM-500, IBM-1047, and IBM-1140 SBCS preview support.
- IBM-930, IBM-933, IBM-935, IBM-937, IBM-939, IBM-1364, IBM-1371, IBM-1388, IBM-1390, and IBM-1399 DBCS preview support.
- IBM EBCDIC DBCS SO/SI diagnostics for explicit DBCS mode, missing or unmatched shift bytes, and conservative DBCS ambiguity warnings.
- Expandable diagnostics panel with category filters, location buttons, and previous/next navigation.
- Immediate diagnostics updates after nibble edits, byte insertion, and byte deletion.
- Save, reload, and revert flows for edited raw bytes.
- Save confirmation when IBM EBCDIC DBCS structural diagnostics report blocking DBCS issues.
- Condense Mode setting for a denser byte grid.
- Collapsible editor header for more vertical editing space.
- Optional column ruler for fixed-format byte columns.
- User-configurable `DBCS_AMBIGUOUS` byte-pair exclusions with default-rule seeding in user settings JSON.
- Warning when a manually entered IBM-style code page id is not yet supported for code-page-aware preview.
- VSIX packaging script.
- README and Marketplace screenshot assets.
- Project icon and initial user-facing documentation.
- First-pass localization catalogs and README pages for Traditional Chinese, Simplified Chinese, Japanese, Korean, and German.
- Jump-to-diagnostic scrolling now accounts for the sticky column ruler, and IBM-937 DBCS ambiguity detection can backtrack pending ambiguous pairs into a missing-SO DBCS run.

### Current Limits

- Local files and Zowe Explorer `zowe-ds` / `zowe-uss` resources are supported.
- For Zowe host raw-byte editing, start HEX ON from the Zowe Explorer tree so the resource can be reopened in binary mode.
- IBM-037, IBM-500, IBM-1047, and IBM-1140 have SBCS preview support but no DBCS diagnostics.
- IBM-930, IBM-933, IBM-935, IBM-937, IBM-939, IBM-1364, IBM-1371, IBM-1388, IBM-1390, and IBM-1399 have SO/SI DBCS diagnostics.
- Other encodings are currently preview/edit flows without code-page-specific diagnostics.
- Additional IBM EBCDIC SBCS or DBCS code pages can be added after mapping tables, fixtures, and tests are available.
- First-pass localization still needs native-speaker or product localization review before external publication.
- Marketplace publication still needs product-team review for naming, legal notices, and generated mapping table attribution.
