# Roadmap

This roadmap captures the current direction after the IBM-937 MVP.

## Near Term

1. Keep regression coverage stable across IBM-037, IBM-500, IBM-1047, IBM-1140, IBM-930, IBM-933, IBM-935, IBM-937, IBM-939, IBM-1364, IBM-1371, IBM-1388, IBM-1390, and IBM-1399 fixtures.
2. Run a full Extension Development Host and VSIX install acceptance pass using [acceptance-checklist.md](acceptance-checklist.md), including all enabled IBM EBCDIC SBCS and DBCS profiles.
3. Record the release-candidate validation pass in [release-checklist.md](release-checklist.md).
4. Capture manual validation notes for the IBM-1364/1371/1388/1390/1399 batch after the generated-table tests pass.
5. Capture or refresh the screenshots listed in [screenshots.md](screenshots.md).
6. Review the Marketplace-ready copy in [marketplace.md](marketplace.md) with the product team before publishing.
7. Keep [../CHANGELOG.md](../CHANGELOG.md) current as MVP release notes evolve.

## Zowe Explorer Resources

Implemented direction:

- accept `zowe-ds:` and `zowe-uss:` resources in addition to local `file:` resources;
- expose `IBM Z Hex Editor: Open HEX ON` from supported Zowe Explorer Data Sets and USS tree items;
- when launched from a Zowe tree item, call `zowe.openWithEncoding` with binary mode before HEX ON reads the resource bytes;
- when launched from an already open Zowe editor, allow best-effort editing but warn that the bytes may reflect the existing Zowe text-transfer encoding.

Planned review:

- manually validate tree-context launch and save behavior with real z/OSMF and RSE API profiles;
- confirm whether Zowe Explorer keeps the selected tree node encoding state synchronized after `zowe.openWithEncoding`;
- investigate a future direct raw-download path through public Zowe APIs only if binary tree launch is not enough;
- keep this integration non-invasive unless the Zowe Explorer or Z Open Editor teams explicitly approve a tighter integration contract.

## Multi-Code-Page EBCDIC DBCS Support

The editor is already byte-first, so support for additional IBM EBCDIC code pages should build on the current architecture instead of changing the editing model.

Planned direction:

- continue extracting IBM-937-specific codec and inspector behavior into reusable IBM DBCS profile APIs documented in [code-page-architecture.md](code-page-architecture.md);
- represent each code page as a profile with SBCS mapping, and for DBCS profiles also DBCS mapping, SO/SI behavior, and ambiguity rules;
- keep IBM-937 as the reference implementation and regression baseline;
- add encoding picker entries only after a code page profile has reliable tables and tests.

Enabled profiles:

- `IBM-037`: US/Canada EBCDIC SBCS, generated from ICU `.ucm`.
- `IBM-500`: International EBCDIC SBCS, generated from ICU `.ucm`.
- `IBM-1047`: Latin-1/Open Systems EBCDIC SBCS, generated from ICU `.ucm`.
- `IBM-1140`: US/Canada EBCDIC SBCS with Euro, generated from ICU `.ucm`.
- `IBM-930`: Japanese Katakana-Kanji host mixed, generated from ICU `.ucm`.
- `IBM-933`: Korean EBCDIC DBCS, generated from ICU `.ucm`.
- `IBM-935`: Simplified Chinese EBCDIC DBCS, generated from ICU `.ucm`.
- `IBM-937`: Traditional Chinese, current MVP baseline.
- `IBM-939`: Japanese Latin-Kanji host mixed, generated from ICU `.ucm` over IBM-930.
- `IBM-1364`: Korean host mixed extended, including full Hangul coverage.
- `IBM-1371`: Traditional Chinese host mixed with euro extensions.
- `IBM-1388`: Simplified Chinese GB 18030 host with UDCs and Uygur extension.
- `IBM-1390`: Extended Japanese Katakana-Kanji host mixed for JIS X0213.
- `IBM-1399`: Extended Japanese Latin-Kanji host mixed for JIS X0213.

The IBM-1364/1371/1388/1390/1399 batch is implemented with the same pattern as IBM-933 and IBM-935: manifest entry, generated table, profile module, registry entry, fixture, codec tests, fixture diagnostics tests, acceptance checklist updates, and user documentation updates.

Open questions:

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

Localization is now in a first-pass implementation state. The main editor workflows and diagnostics wording have stabilized enough for engineering translations, but native-speaker and product localization review should still happen before external publication.

Initial target languages:

- English
- Traditional Chinese
- Simplified Chinese
- Japanese
- Korean
- German

Implemented:

- extension contribution strings are routed through `package.nls.json`;
- translated package contribution files exist for Traditional Chinese, Simplified Chinese, Japanese, Korean, and German;
- extension host prompts and status text are routed through `src/i18n.ts` and `vscode.l10n.t(...)`;
- extension host localization bundles exist under `l10n/`;
- webview UI strings are routed through `webview/src/i18n.ts`;
- the host passes `vscode.env.language` to the webview through `EditorViewSettings.locale`;
- diagnostics category identifiers remain stable.

Planned review:

- review first-pass Traditional Chinese, Simplified Chinese, Japanese, Korean, and German translations with native speakers or product localization owners;
- test German text expansion in standard and Condense Mode layouts;
- test CJK readability in compact header, diagnostics, and encoding picker flows;
- translate only labels, descriptions, prompts, and help text, not internal diagnostic identifiers.

## Packaging

The repository provides `npm run package:vsix`, which builds the extension and writes `dist/ibm-z-hex-on-editor.vsix` for local installation testing.

Release documentation is staged in [marketplace.md](marketplace.md), with screenshot capture guidance in [screenshots.md](screenshots.md). Screenshots should be generated from fixture files and reviewed before adding them to the README or Marketplace listing.

Use [release-checklist.md](release-checklist.md) to record the final VSIX validation environment, command results, manual acceptance outcome, release assets, and sign-off decision.

Packaging principles:

- keep the extension fully usable from a single installed `.vsix`;
- do not require remote downloads or external JSON assets for code page mapping tables;
- remove only obvious development, test, temporary, and unrelated dependency files from the VSIX;
- if mapping tables are optimized later, prefer lazy loading from bundled VSIX assets or bundled modules so offline functionality remains complete after installation.
