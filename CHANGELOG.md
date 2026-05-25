# Change Log

All notable changes to the IBM Z HEX ON Editor extension will be documented in this file.

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

- Local files only.
- IBM-037, IBM-500, IBM-1047, and IBM-1140 have SBCS preview support but no DBCS diagnostics.
- IBM-930, IBM-933, IBM-935, IBM-937, IBM-939, IBM-1364, IBM-1371, IBM-1388, IBM-1390, and IBM-1399 have SO/SI DBCS diagnostics.
- Other encodings are currently preview/edit flows without code-page-specific diagnostics.
- Additional IBM EBCDIC SBCS or DBCS code pages can be added after mapping tables, fixtures, and tests are available.
- First-pass localization still needs native-speaker or product localization review before external publication.
- Marketplace publication still needs product-team review for naming, legal notices, and generated mapping table attribution.
