# IBM EBCDIC DBCS Diagnostics

This document describes the current diagnostics used by the IBM Z HEX ON Editor when the selected file-content encoding is a supported IBM EBCDIC DBCS profile such as `ibm930`, `ibm933`, `ibm935`, `ibm937`, `ibm939`, `ibm1364`, `ibm1371`, `ibm1388`, `ibm1390`, or `ibm1399`.

SBCS-only EBCDIC profiles such as `ibm37`, `ibm500`, `ibm1047`, and `ibm1140` use code-page preview and EBCDIC newline handling, but they do not run SO/SI DBCS diagnostics.

The editor reads raw bytes from disk. Diagnostics are computed from those bytes, not from the Unicode text that VS Code may have decoded for the same file in a normal text editor.

## Modes

IBM EBCDIC DBCS text uses shift bytes:

- `SO` (`0x0E`) enters DBCS mode.
- `SI` (`0x0F`) returns to SBCS mode.
- Bytes outside `SO ... SI` are treated as SBCS mode by default.

The inspector walks the byte stream from left to right and keeps the current mode as state.

## Scan Order

The inspector is stateful and intentionally byte-first:

1. `SO` and `SI` are handled before any byte-pair interpretation.
2. In explicit DBCS mode, valid two-byte mappings are recorded as `DBCS`.
3. In SBCS mode, valid two-byte mappings are first checked as possible `DBCS_AMBIGUOUS` warnings.
4. A run of pending `DBCS_AMBIGUOUS` warnings can later be reclassified if a stronger missing-shift signal appears.
5. Strong SBCS bytes are emitted as `SBCS`.
6. Bytes that are neither valid DBCS candidates nor strong SBCS bytes are emitted as `INVALID_OR_UNKNOWN`.

This order is what lets the editor distinguish normal source text, explicit `SO ... SI` DBCS text, and likely damaged DBCS runs with missing shift bytes.

## Diagnostic Categories

### Structural Markers

`SO`
: A normal `0x0E` byte that enters DBCS mode.

`SI`
: A normal `0x0F` byte that returns to SBCS mode.

### Normal Content

`SBCS`
: A byte interpreted as a single-byte IBM DBCS profile character while the inspector is in SBCS mode.

`DBCS`
: A valid two-byte DBCS pair found while the inspector is inside explicit `SO ... SI` DBCS mode.

`DBCS` can also be emitted for inferred DBCS bytes after a missing `SO` is detected. In that case, the first pair in the inferred run is marked as `MISSING_SO`; later pairs in the inferred run are marked as `DBCS` so the editor can highlight the whole repaired interpretation path without counting every pair as a separate structural problem.

The summary line's `DBCS pair(s)` count intentionally uses only `DBCS`. It does not include `DBCS_AMBIGUOUS`, because ambiguous pairs are warnings in SBCS mode rather than confirmed DBCS content.

### Warnings

`DBCS_AMBIGUOUS`
: A valid DBCS pair found while the inspector is in SBCS mode, where both bytes are also permitted SBCS bytes.

This warning means "these two bytes can be read as a DBCS character, but the current SO/SI state says they are SBCS." It does not block save.

To avoid noisy false positives in COBOL and other source-like files, the current MVP only reports this warning when all of the following are true:

- the byte pair is a valid DBCS mapping for the selected profile;
- the current mode is SBCS;
- both bytes are plausible SBCS bytes;
- the DBCS mapping resolves to a normal Unicode character rather than a Private Use Area code point;
- both bytes are symbolic SBCS bytes rather than letters or digits;
- the pair is not an obvious SBCS filler pair such as `0x40 0x40` spaces or repeated `0x5C 0x5C` asterisks.

The default exclusion list includes `0x40 0x40` and `0x5C 0x5C`. Users can enable `ibmZHexEditor.dbcsAmbiguousExclusionsEnabled` to replace the defaults with custom `DBCS_AMBIGUOUS` exclusions from VS Code user settings JSON. When enabled and no custom list exists yet, the extension seeds the user settings JSON with the default exclusions so users can modify them directly. An explicitly configured empty list is respected and means no ambiguous pairs are excluded.

Examples:

- `0x5A 0x61` can be `!/` as SBCS and `U+6E2C` as DBCS, so it can be reported as `DBCS_AMBIGUOUS` when found in SBCS mode.
- `0x5C 0x5C` can technically map to a DBCS character, but is common as COBOL `**` filler/comment text, so it is not reported.
- `0xD3 0xC9` can technically map through the table, but resolves to the Unicode Private Use Area and looks like SBCS letters, so it is not reported.

`AMBIGUOUS`
: Reserved for future non-DBCS ambiguity categories. It is currently counted as a warning if emitted.

### Problems

Problem diagnostics indicate likely SO/SI structure corruption and are included in the save confirmation prompt.

`MISSING_SO`
: A valid DBCS pair appears while the inspector is in SBCS mode, and the bytes do not look like normal SBCS bytes. The inspector infers that an `SO` may be missing before the pair.

If the inspector has already collected a pending run of `DBCS_AMBIGUOUS` pairs and then encounters a stronger DBCS-only pair, it backs the `MISSING_SO` location up to the first pending ambiguous pair. The remaining pending pairs and the current pair are then emitted as inferred `DBCS`.

Example: in IBM-937, the bytes for `測試一下中文` normally appear inside `SO ... SI`. If the leading `SO` is removed, `測` and `試` can initially look ambiguous in SBCS mode, but the later pair for `一` is a stronger DBCS-only signal. The inspector therefore reports one `MISSING_SO` at `測` and highlights the following bytes as inferred `DBCS`.

`MISSING_SI`
: A strong SBCS byte appears while the inspector is in DBCS mode. The inspector infers that an `SI` may be missing before the byte.

`MISSING_SI_AT_EOF`
: The file ends while the inspector is still in DBCS mode.

`UNMATCHED_SO`
: An `SO` appears while the inspector is already in DBCS mode.

`UNMATCHED_SI`
: An `SI` appears while the inspector is already in SBCS mode.

`INVALID_OR_UNKNOWN`
: A byte or DBCS candidate does not match a valid DBCS pair and is not a strong SBCS byte for the current mode.

## Save Behavior

The editor can save files with warning diagnostics. Warnings are advisory.

When problem diagnostics are present, the extension shows a modal confirmation before saving. The prompt summarizes only structural problem categories, not warning categories. If the user confirms, the editor writes the current raw bytes exactly as edited.

## Display Behavior

Diagnostic events annotate the byte grid by byte offset:

- problem events such as `MISSING_SO` use the problem highlight;
- warning events such as `DBCS_AMBIGUOUS` use the warning highlight;
- inferred or explicit `DBCS` bytes use a softer informational highlight;
- plain `SBCS`, `SO`, and `SI` events are counted but are not shown as problems.

Location buttons in the diagnostics panel jump only to problem and warning categories. Informational categories such as `DBCS` and `SBCS` are shown as counts, not as jump lists.

## Known Limits

- Diagnostics currently exist for `ibm930`, `ibm933`, `ibm935`, `ibm937`, `ibm939`, `ibm1364`, `ibm1371`, `ibm1388`, `ibm1390`, and `ibm1399`.
- The `DBCS_AMBIGUOUS` rule is intentionally conservative. It favors reducing noise in source files over reporting every possible DBCS table match.
- IBM DBCS mapping tables can contain Private Use Area mappings. These are treated as non-normal DBCS candidates for ambiguity warnings.
