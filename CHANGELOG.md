# Change Log

All notable changes to the IBM Z HEX ON Editor extension will be documented in this file.

## 0.1.0 - MVP Preview

Initial MVP preview for local HEX ON byte editing in VS Code.

### Added

- ISPF-style HEX ON custom editor for local files.
- Raw byte editing with high and low hex-nibble rows.
- Read-only character preview based on the selected file-content encoding.
- Encoding picker that treats the VS Code-reported encoding as a reference and lets the user choose the actual bytes-on-disk encoding.
- IBM-930, IBM-937, and IBM-939 preview support.
- IBM EBCDIC DBCS SO/SI diagnostics for explicit DBCS mode, missing or unmatched shift bytes, and conservative DBCS ambiguity warnings.
- Expandable diagnostics panel with category filters, location buttons, and previous/next navigation.
- Immediate diagnostics updates after nibble edits, byte insertion, and byte deletion.
- Save, reload, and revert flows for edited raw bytes.
- Save confirmation when IBM EBCDIC DBCS structural diagnostics report blocking DBCS issues.
- Condense Mode setting for a denser byte grid.
- VSIX packaging script.
- Project icon and initial user-facing documentation.

### Current Limits

- Local files only.
- IBM-930, IBM-937, and IBM-939 have SO/SI DBCS diagnostics.
- Other encodings are currently preview/edit flows without code-page-specific diagnostics.
- Additional IBM EBCDIC DBCS code pages are planned after the generated-table workflow is validated with more fixtures.
- Localization is planned near the end of the MVP cycle.
