# Code Page Architecture

This document describes the first refactor step toward supporting additional IBM EBCDIC DBCS code pages.

The editor remains byte-first:

1. read raw bytes from disk;
2. choose the actual file-content encoding;
3. preview bytes through the selected code page;
4. edit raw bytes directly;
5. save raw bytes back to disk.

## Current Shape

IBM-930, IBM-937, and IBM-939 are represented as profiles:

- `src/codec/ibmDbcs.ts`
  - generic IBM DBCS profile interface;
  - generic encode/decode helpers;
  - generic DBCS pair and SBCS byte decoding helpers.
- `src/codec/ibm937.ts`
  - `IBM937_PROFILE`;
  - compatibility wrappers such as `encodeToIbm937`, `decodeFromIbm937`, and `decodeDbcsPair`.
- `src/codec/ibm930.ts` and `src/codec/ibm939.ts`
  - generated-table backed Japanese profile modules.
- `src/codec/generated/`
  - generated ICU `.ucm` mapping tables for IBM-930 and IBM-939.
- `src/inspector/inspectIbmDbcs.ts`
  - generic SO/SI diagnostics traversal for IBM EBCDIC DBCS profiles.
- `src/inspector/inspect937.ts`
  - compatibility wrapper around `inspectIbmDbcs(IBM937_PROFILE, bytes)`.
- `src/codePages.ts`
  - profile registry used by preview and diagnostics code.

Existing IBM-937 public helper names are intentionally preserved so current tests and callers continue to work.

## Adding A New IBM DBCS Code Page

Add a new profile only after reliable mapping tables and fixture bytes are available. The current source strategy is documented in [mapping-table-sources.md](mapping-table-sources.md).

Recommended steps:

1. Run `node scripts/generate-ucm-tables.mjs --profile <id> --dry-run` and confirm the source chain and counts.
2. Add generated mapping tables under `src/codec/` or `src/codec/generated/`.
3. Add a profile module, for example `src/codec/ibm939.ts`.
4. Export a profile object with:
   - `id`
   - `label`
   - `so`
   - `si`
   - `sbcsToUnicode`
   - `unicodeToSbcs`
   - `dbcsToUnicode`
   - `unicodeToDbcs`
   - `newlineBytes`
   - `replacementByte`
   - `replacementText`
5. Register the profile in `src/codePages.ts`.
6. Add encoding picker entries only after tests pass.
7. Add codec roundtrip tests.
8. Add SO/SI diagnostics tests.
9. Add at least one fixture regression test.
10. Update user documentation and diagnostics notes.

## Candidate Profiles

Enabled profiles:

- `IBM-930` for Japanese Katakana-Kanji EBCDIC DBCS;
- `IBM-937` for Traditional Chinese EBCDIC DBCS;
- `IBM-939` for Japanese Latin-Kanji EBCDIC DBCS.

Initial remaining candidates:

- `IBM-933` for Korean EBCDIC DBCS;
- `IBM-935` for Simplified Chinese EBCDIC DBCS.

## Diagnostics Assumptions To Verify

The current generic inspector assumes:

- `SO` enters DBCS mode and `SI` returns to SBCS mode;
- DBCS bytes are two-byte pairs;
- bytes below `0x40` are strong SBCS/control indicators;
- common EBCDIC Latin letters, digits, and selected symbols are strong SBCS indicators;
- Private Use Area DBCS mappings should not create DBCS ambiguous warnings;
- obvious SBCS filler pairs such as spaces and repeated asterisks should not create DBCS ambiguous warnings.

Before enabling a new code page, verify these assumptions against real sample data for that language and code page. If needed, extend the profile interface with profile-specific predicates rather than adding code-page branches inside the inspector.

## Planned Configurable Ambiguity Rules

`DBCS_AMBIGUOUS` exclusions should become user-configurable without making the inspector depend directly on VS Code APIs.

Planned shape:

1. Extension code reads settings and produces an effective exclusion set.
2. If custom exclusions are enabled for the first time, extension code writes the default rules into user settings JSON.
3. The byte model passes the effective exclusion set into `inspectIbmDbcs`.
4. The inspector applies the set while deciding whether a valid DBCS pair in SBCS mode should emit `DBCS_AMBIGUOUS`.

Keep parsing and validation outside the inspector. The inspector should receive normalized pair keys such as `0x4040` and `0x5C5C`.

## Non-Goals For The IBM-930/939 Step

- Do not replace the existing IBM-937 table yet.
- Do not enable IBM-933 or IBM-935 until fixtures and tests are added.
- Do not broaden diagnostics heuristics beyond the generic IBM DBCS rules until real language-specific samples justify it.
