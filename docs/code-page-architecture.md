# Code Page Architecture

This document describes the first refactor step toward supporting additional IBM EBCDIC DBCS code pages.

The editor remains byte-first:

1. read raw bytes from disk;
2. choose the actual file-content encoding;
3. preview bytes through the selected code page;
4. edit raw bytes directly;
5. save raw bytes back to disk.

## Current Shape

IBM-937 is now represented as a profile:

- `src/codec/ibmDbcs.ts`
  - generic IBM DBCS profile interface;
  - generic encode/decode helpers;
  - generic DBCS pair and SBCS byte decoding helpers.
- `src/codec/ibm937.ts`
  - `IBM937_PROFILE`;
  - compatibility wrappers such as `encodeToIbm937`, `decodeFromIbm937`, and `decodeDbcsPair`.
- `src/inspector/inspectIbmDbcs.ts`
  - generic SO/SI diagnostics traversal for IBM EBCDIC DBCS profiles.
- `src/inspector/inspect937.ts`
  - compatibility wrapper around `inspectIbmDbcs(IBM937_PROFILE, bytes)`.
- `src/codePages.ts`
  - profile registry used by preview and diagnostics code.

Existing IBM-937 public helper names are intentionally preserved so current tests and callers continue to work.

## Adding A New IBM DBCS Code Page

Add a new profile only after reliable mapping tables and fixture bytes are available.

Recommended steps:

1. Add generated mapping tables under `src/codec/`.
2. Add a profile module, for example `src/codec/ibm939.ts`.
3. Export a profile object with:
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
4. Register the profile in `src/codePages.ts`.
5. Add encoding picker entries only after tests pass.
6. Add codec roundtrip tests.
7. Add SO/SI diagnostics tests.
8. Add at least one fixture regression test.
9. Update user documentation and diagnostics notes.

## Candidate Profiles

Initial candidates remain:

- `IBM-939` or `IBM-930` for Japanese EBCDIC DBCS;
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

## Non-Goals For This Step

- No new mapping tables are added.
- No new encoding picker entries are enabled.
- No user-visible behavior should change for IBM-937.
