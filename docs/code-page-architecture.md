# Code Page Architecture

This document describes the profile architecture for supporting IBM EBCDIC SBCS and DBCS code pages.

The editor remains byte-first:

1. read raw bytes from disk;
2. choose the actual file-content encoding;
3. preview bytes through the selected code page;
4. edit raw bytes directly;
5. save raw bytes back to disk.

## Current Shape

Supported IBM EBCDIC code pages are represented as profiles:

- `src/codec/ibmSbcs.ts`
  - generic IBM SBCS profile interface;
  - generic single-byte encode/decode helpers.
- `src/codec/ibmDbcs.ts`
  - generic IBM DBCS profile interface;
  - generic encode/decode helpers;
  - generic DBCS pair and SBCS byte decoding helpers.
- `src/codec/ibm37.ts`, `src/codec/ibm500.ts`, `src/codec/ibm1047.ts`, and `src/codec/ibm1140.ts`
  - generated-table backed SBCS EBCDIC profile modules.
- `src/codec/ibm937.ts`
  - `IBM937_PROFILE`;
  - compatibility wrappers such as `encodeToIbm937`, `decodeFromIbm937`, and `decodeDbcsPair`.
- `src/codec/ibm930.ts`, `src/codec/ibm933.ts`, `src/codec/ibm935.ts`, `src/codec/ibm939.ts`, `src/codec/ibm1364.ts`, `src/codec/ibm1371.ts`, `src/codec/ibm1388.ts`, `src/codec/ibm1390.ts`, and `src/codec/ibm1399.ts`
  - generated-table backed Japanese, Korean, Simplified Chinese, and Traditional Chinese profile modules.
- `src/codec/generated/`
  - generated ICU `.ucm` mapping tables for enabled SBCS and DBCS profiles.
- `src/inspector/inspectIbmDbcs.ts`
  - generic SO/SI diagnostics traversal for IBM EBCDIC DBCS profiles.
- `src/inspector/inspect937.ts`
  - compatibility wrapper around `inspectIbmDbcs(IBM937_PROFILE, bytes)`.
- `src/codePages.ts`
  - profile registry used by preview and diagnostics code.

Existing IBM-937 public helper names are intentionally preserved so current tests and callers continue to work.

## Adding A New IBM EBCDIC Code Page

Add a new profile only after reliable mapping tables and fixture bytes are available. The current source strategy is documented in [mapping-table-sources.md](mapping-table-sources.md).

Recommended steps:

1. Run `node scripts/generate-ucm-tables.mjs --profile <id> --dry-run` and confirm the source chain and counts.
2. Add generated mapping tables under `src/codec/` or `src/codec/generated/`.
3. Add a profile module, for example `src/codec/ibm939.ts`.
4. Export a profile object.

   For SBCS profiles:
   - `id`
   - `label`
   - `sbcsToUnicode`
   - `unicodeToSbcs`
   - `newlineBytes`
   - `replacementByte`
   - `replacementText`

   For DBCS profiles:
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
8. Add SO/SI diagnostics tests for DBCS profiles.
9. Add at least one fixture regression test.
10. Update user documentation and diagnostics notes.

## Candidate Profiles

Enabled profiles:

SBCS:

- `IBM-037` for US/Canada EBCDIC SBCS;
- `IBM-500` for International EBCDIC SBCS;
- `IBM-1047` for Latin-1/Open Systems EBCDIC SBCS;
- `IBM-1140` for US/Canada EBCDIC SBCS with Euro.

DBCS:

- `IBM-930` for Japanese Katakana-Kanji EBCDIC DBCS;
- `IBM-933` for Korean EBCDIC DBCS;
- `IBM-935` for Simplified Chinese EBCDIC DBCS;
- `IBM-937` for Traditional Chinese EBCDIC DBCS;
- `IBM-939` for Japanese Latin-Kanji EBCDIC DBCS;
- `IBM-1364` for extended Korean with full Hangul;
- `IBM-1371` for extended Traditional Chinese;
- `IBM-1388` for Simplified Chinese GB 18030 host;
- `IBM-1390` and `IBM-1399` for extended Japanese variants.

The IBM-1364/1371/1388/1390/1399 batch follows the same generated-table flow as IBM-930/933/935/939: manifest entry, generated table, profile module, registry entry, fixture, codec tests, fixture diagnostics tests, acceptance checklist updates, and user documentation updates.

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

## Non-Goals For The Current Generated-Table Step

- Do not replace the existing IBM-937 table yet.
- Do not broaden diagnostics heuristics beyond the generic IBM DBCS rules until real language-specific samples justify it.
