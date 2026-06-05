# IBM Z HEX ON Editor 0.1.0

This MVP preview provides an ISPF-style HEX ON byte editor for local files and supported Zowe Explorer resources in VS Code-compatible editors such as IBM Bob.

## Highlights

- Open local files, Zowe data sets, and Zowe USS files in a custom HEX ON editor.
- Edit raw bytes as high and low hex nibbles.
- Choose the actual bytes-on-disk encoding instead of relying only on the editor-reported text encoding.
- Preview UTF-8, IBM EBCDIC SBCS, and supported IBM EBCDIC DBCS files.
- Inspect SO/SI structure for supported IBM EBCDIC DBCS files.
- Navigate diagnostics by category and exact byte location.
- Insert and delete bytes directly from the hex grid.
- Use Condense Mode, a collapsible header, and an optional column ruler for fixed-format files.
- Configure DBCS ambiguous byte-pair exclusions from user settings JSON.
- Receive a warning before using unsupported manually entered IBM code page ids.
- Reject unknown manually entered encoding names that are not supported VS Code encoding ids or IBM-style code page ids.

## Supported IBM EBCDIC Code Pages

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

## Validation

- TypeScript check passed.
- Unit and fixture regression tests passed: 20 test files, 108 tests.
- VSIX packaging passed.
- Manual acceptance passed on 2026-05-26 with IBM Bob `1.109.5+bob1.0.2`.

See [docs/release-checklist.md](release-checklist.md) for the detailed validation record.

## Current Limits

- Local files and Zowe Explorer `zowe-ds` / `zowe-uss` resources are supported.
- IBM EBCDIC SBCS profiles provide preview but no SO/SI diagnostics.
- IBM EBCDIC DBCS diagnostics are available only for the supported DBCS profiles listed above.
- Unsupported IBM-style code page ids can still be edited as raw bytes, but use generic preview, row splitting, and diagnostics behavior.
- Unknown custom encoding names are rejected instead of being opened through VS Code's internal decode fallback.
- Full localization catalogs are planned after MVP copy stabilizes.
- External Marketplace publication still requires product-team review for naming, legal notices, icon usage, and generated mapping table attribution.
