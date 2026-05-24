# Roadmap

This roadmap captures the current direction after the IBM-937 MVP.

## Near Term

1. Keep IBM-937 regression coverage stable.
2. Run a full Extension Development Host and VSIX install acceptance pass using [acceptance-checklist.md](acceptance-checklist.md).
3. Capture the screenshots listed in [screenshots.md](screenshots.md).
4. Keep [../CHANGELOG.md](../CHANGELOG.md) current as MVP release notes evolve.

## Multi-Code-Page EBCDIC DBCS Support

The editor is already byte-first, so support for additional IBM EBCDIC code pages should build on the current architecture instead of changing the editing model.

Planned direction:

- continue extracting IBM-937-specific codec and inspector behavior into reusable IBM DBCS profile APIs documented in [code-page-architecture.md](code-page-architecture.md);
- represent each code page as a profile with SBCS mapping, DBCS mapping, SO/SI behavior, and ambiguity rules;
- keep IBM-937 as the reference implementation and regression baseline;
- add encoding picker entries only after a code page profile has reliable tables and tests.

Initial candidate profiles:

- `IBM-937`: Traditional Chinese, current MVP baseline.
- `IBM-939` or `IBM-930`: Japanese EBCDIC DBCS.
- `IBM-933`: Korean EBCDIC DBCS.
- `IBM-935`: Simplified Chinese EBCDIC DBCS.

Open questions:

- reliable table source and generation workflow for each code page, now tracked in [mapping-table-sources.md](mapping-table-sources.md);
- whether all target code pages use the same SO/SI structure assumptions;
- how to classify Private Use Area and vendor-specific mappings for ambiguity diagnostics;
- whether each language needs different noise-reduction rules for source-like files.

## Localization

Localization should be planned late in the MVP cycle, after the main editor workflows and diagnostics wording have stabilized. Deferring this avoids repeatedly updating translations while the feature surface is still changing.

Initial target languages:

- English
- Traditional Chinese
- Simplified Chinese
- Japanese
- Korean
- German

Planned direction:

- move extension contribution strings into VS Code localization files;
- move webview UI strings into a small message catalog;
- keep diagnostics category identifiers stable and translate only labels, descriptions, prompts, and help text;
- add a final localization pass before a public release candidate.

## Packaging

The repository provides `npm run package:vsix`, which builds the extension and writes `dist/ibm-z-hex-on-editor.vsix` for local installation testing.
