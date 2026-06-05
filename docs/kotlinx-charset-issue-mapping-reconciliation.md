Hi again. In addition to the SO/SI diagnostics proposal, I would like to propose a separate mapping-source reconciliation track for EBCDIC charset tables.

This is related to our IBM Z HEX ON Editor work, where we had to compare multiple mapping sources while supporting IBM EBCDIC SBCS and stateful DBCS code pages. The main lesson was that mapping sources should not be blindly merged by union. A report-first reconciliation tool would make code-page additions and corrections safer and easier to review.

## Motivation

When adding or revising EBCDIC mappings, different sources may disagree:

- current `kotlinx-charset` `.map`, `.nr`, and `.c2b` files;
- Unicode ICU `.ucm` files;
- JVM charset behavior;
- IBM or Unicode source revisions;
- base-overlay relationships such as `IBM-937` over `IBM-1371`, `IBM-939` over `IBM-930`, or `IBM-1399` over `IBM-1390`;
- fallback mappings, non-roundtrip mappings, substitutions, and Private Use Area mappings.

The same byte sequence can map to different Unicode code points, and the same Unicode character can sometimes reverse-map to multiple byte sequences. That means adding more mapping data needs an explicit policy rather than a simple set union.

## Proposed normalized row shape

One possible intermediate model:

```kotlin
public data class MappingSourceRow(
  val charsetName: String,
  val bytes: Int,
  val codePoints: IntArray,
  val direction: MappingDirection,
  val sourceId: String,
  val sourceRevision: String,
  val fallbackKind: MappingFallbackKind,
)

public enum class MappingDirection {
  BYTE_TO_CHAR,
  CHAR_TO_BYTE,
  BOTH,
}

public enum class MappingFallbackKind {
  ROUNDTRIP,
  FALLBACK,
  SUBSTITUTION,
  NON_ROUNDTRIP,
}
```

The exact API does not matter much at first; the important part is having a normalized comparison model before generating final tables.

## Report-first workflow

The reconciliation tool could read current mappings plus candidate sources and write a JSON or Markdown report with categories such as:

- `same`: all sources agree.
- `onlyInCurrent`: present only in current `kotlinx-charset` mappings.
- `onlyInCandidate`: present only in a candidate source such as ICU.
- `conflict`: the same bytes map to different Unicode code points, or the same Unicode sequence maps to different byte sequences.
- `fallbackOnly`: present only as fallback or substitution data.
- `privateUse`: maps to Unicode Private Use Area and may need special diagnostics or reverse-encoding policy.
- `baseOverlay`: resolved from an ICU `<icu:base>` relationship.

This lets maintainers review differences before any generator changes alter the actual charset behavior.

## Suggested merge policy defaults

These are suggested starting points, not hard requirements:

- Prefer roundtrip mappings over fallback mappings for normal encode/decode.
- Keep fallback mappings out of reverse encoding unless explicitly accepted.
- Preserve non-roundtrip mappings in the existing `.nr` / `.c2b` style when they are needed to match current behavior.
- Preserve Private Use Area mappings for decoding when already part of a supported charset, but do not let them create default DBCS ambiguous warnings in diagnostics.
- Resolve base mappings first, then overlay derived code-page deltas.
- Keep source names, source URLs, source revisions, and copyright/license notices visible in reports and generated output.

## Possible delivery sequence

1. Add a report-only task or CLI command that compares existing `kotlinx-charset` mappings with candidate mapping sources.
2. Review the generated reports and agree on merge policy.
3. Update generators only after the report format and policy are accepted.
4. Use the tooling to add or revise code pages in smaller follow-up PRs.

## Candidate code pages

This could eventually help with stateful DBCS code pages beyond the currently supported IBM930/937/939/1390/1399 set. Candidate additions from our validation work include:

- IBM-933 Korean EBCDIC DBCS
- IBM-935 Simplified Chinese EBCDIC DBCS
- IBM-1364 Extended Korean EBCDIC DBCS
- IBM-1371 Extended Traditional Chinese EBCDIC DBCS
- IBM-1388 Simplified Chinese GB 18030 Host DBCS

I am not proposing to copy generated TypeScript mapping tables from our VS Code extension into this project. Instead, the safer path would be to use traceable source files and the `kotlinx-charset` conversion/generation style.

## Questions

- Would this belong in the existing `ucm` / `ucm-cli` modules, in `buildSrc`, or in a separate tool module?
- What source hierarchy should be considered authoritative when ICU, current tables, and JVM charset behavior disagree?
- Would a report-only first PR be useful before any mapping data changes?
- Are there preferred source revisions or mapping sources that should be used for the candidate IBM DBCS code pages?

If this direction is useful, I can start with a report-only prototype for one existing supported charset, such as IBM-937, so the output can be reviewed before touching generation behavior.
