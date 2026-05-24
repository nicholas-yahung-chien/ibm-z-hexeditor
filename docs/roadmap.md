# Roadmap

This roadmap captures the current direction after the IBM-937 MVP.

## Near Term

1. Keep regression coverage stable across IBM-930, IBM-933, IBM-935, IBM-937, and IBM-939 fixtures.
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

Enabled profiles:

- `IBM-930`: Japanese Katakana-Kanji host mixed, generated from ICU `.ucm`.
- `IBM-933`: Korean EBCDIC DBCS, generated from ICU `.ucm`.
- `IBM-935`: Simplified Chinese EBCDIC DBCS, generated from ICU `.ucm`.
- `IBM-937`: Traditional Chinese, current MVP baseline.
- `IBM-939`: Japanese Latin-Kanji host mixed, generated from ICU `.ucm` over IBM-930.

Open questions:

- reliable table source and generation workflow for each code page, now tracked in [mapping-table-sources.md](mapping-table-sources.md);
- whether all target code pages use the same SO/SI structure assumptions;
- how to classify Private Use Area and vendor-specific mappings for ambiguity diagnostics;
- whether each language needs different noise-reduction rules for source-like files.

## User-Configurable Diagnostics

Implemented direction:

- `ibmZHexEditor.dbcsAmbiguousExclusionsEnabled` enables custom DBCS ambiguous exclusions;
- `ibmZHexEditor.dbcsAmbiguousExclusions` stores byte-pair rules in user settings JSON;
- when the user first enables custom exclusions, the extension seeds user settings JSON with the built-in defaults, such as `40 40` and `5C 5C`, so they can edit or add rules directly;
- rules use this JSON shape:

```json
[
  { "bytes": "40 40", "label": "EBCDIC spaces" },
  { "bytes": "5C 5C", "label": "COBOL repeated asterisks" }
]
```

- rules are validated before use; invalid entries are ignored with a warning;
- built-in exclusions remain active when custom exclusions are disabled;
- the effective exclusion set is passed into the generic IBM DBCS inspector rather than hard-coded inside the diagnostic traversal.

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
