# Roadmap

This roadmap captures the current direction after the IBM-937 MVP.

## Near Term

1. Keep IBM-937 regression coverage stable.
2. Add a repeatable `.vsix` packaging flow.
3. Run a full Extension Development Host acceptance pass.
4. Add screenshots and release notes for the current MVP.

## Multi-Code-Page EBCDIC DBCS Support

The editor is already byte-first, so support for additional IBM EBCDIC code pages should build on the current architecture instead of changing the editing model.

Planned direction:

- extract the IBM-937-specific codec and inspector into reusable IBM DBCS profile APIs;
- represent each code page as a profile with SBCS mapping, DBCS mapping, SO/SI behavior, and ambiguity rules;
- keep IBM-937 as the reference implementation and regression baseline;
- add encoding picker entries only after a code page profile has reliable tables and tests.

Initial candidate profiles:

- `IBM-937`: Traditional Chinese, current MVP baseline.
- `IBM-939` or `IBM-930`: Japanese EBCDIC DBCS.
- `IBM-933`: Korean EBCDIC DBCS.
- `IBM-935`: Simplified Chinese EBCDIC DBCS.

Open questions:

- reliable table source and generation workflow for each code page;
- whether all target code pages use the same SO/SI structure assumptions;
- how to classify Private Use Area and vendor-specific mappings for ambiguity diagnostics;
- whether each language needs different noise-reduction rules for source-like files.

## Packaging

The repository should add a package script using `@vscode/vsce` so testers can install a local `.vsix` without running from the Extension Development Host.
