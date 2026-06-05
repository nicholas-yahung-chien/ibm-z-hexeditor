# kotlinx-charset EBCDIC DBCS diagnostics proposal

## Summary

This proposal describes a small, optional diagnostics layer for
`kotlinx-charset` EBCDIC DBCS charsets. The goal is to preserve the current
encoder/decoder behavior while adding utilities that can inspect raw host bytes
and report SO/SI structure problems, ambiguous DBCS candidates, and byte spans
that tools can use for editor highlights or repair workflows.

The proposal is based on the IBM Z HEX ON Editor implementation and validation
work, but is intentionally shaped as Kotlin Multiplatform library API rather
than VS Code UI behavior.

## Mapping source confirmation

The IBM Z HEX ON Editor currently has two mapping-source paths:

- Most generated SBCS/DBCS tables are generated from Unicode ICU `.ucm` files
  pinned in `scripts/ucm-manifest.json` at ICU revision
  `unicode-org/icu 177fbc931d8f7d929c077c2b2254b79a741a4fae`.
- The original IBM-937 MVP table in `src/codec/tables.ts` is generated from the
  JVM `Cp937` charset, as recorded by its source banner.

For upstream `kotlinx-charset` contributions, the recommended source policy is:

- Do not copy the IBM Z HEX ON Editor generated TypeScript tables into
  `kotlinx-charset`.
- Reuse `kotlinx-charset` existing mapping files when adding diagnostics for
  already-supported charsets.
- If adding new code pages, generate or convert mapping data from traceable
  source files already acceptable to the target project, preferably ICU `.ucm`
  files or the existing `kotlinx-charset` UCM conversion pipeline.
- Preserve source file names, source URLs, source revisions, and copyright or
  license notices.

Relevant source references:

- ICU conversion data documentation:
  https://unicode-org.github.io/icu/userguide/conversion/data.html
- ICU legal guidance:
  https://unicode-org.github.io/icu-docs/legal/
- ICU charset mapping tables overview:
  https://icu.unicode.org/charts/charset

The ICU documentation confirms that `.ucm` files are ICU text mapping files,
that `EBCDIC_STATEFUL` models mixed SBCS/DBCS EBCDIC code pages using SI/SO,
and that `.ucm` source data files should keep their copyright notices when
redistributed.

## Goals

- Add reusable diagnostics for EBCDIC DBCS byte streams.
- Keep decoding and encoding behavior stable.
- Let callers inspect raw bytes without forcing lossy replacement decoding.
- Report byte offsets and lengths so editors and repair tools can highlight or
  navigate exact problem locations.
- Support configurable DBCS ambiguous exclusions for noisy byte pairs such as
  space padding or repeated COBOL comment markers.
- Work on Kotlin Multiplatform targets.

## Non-goals

- Do not auto-repair bytes during normal decoding.
- Do not make the standard decoder infer missing SO/SI.
- Do not change replacement behavior in `XCharsetDecoder` or `XCharsetEncoder`.
- Do not add VS Code-specific concepts.
- Do not vendor IBM Z HEX ON Editor generated mapping tables into
  `kotlinx-charset`.
- Do not blindly merge mapping tables by union without conflict review.

## Proposed API shape

The diagnostics layer needs access to DBCS-specific metadata and lookup helpers.
One minimal approach is to add a public capability interface implemented by
generated EBCDIC DBCS charset objects.

```kotlin
public interface XEbcdicDbcsCharset : XCharset {
  public val shiftOut: Byte
  public val shiftIn: Byte
  public val trailByteRange: IntRange

  /**
   * Decodes one SBCS byte in the initial state.
   * Returns null when the byte is unmappable.
   */
  public fun decodeSbcsByte(byte: Int): String?

  /**
   * Decodes one DBCS byte pair in DBCS state.
   * Returns null when the pair is not a mapped DBCS character.
   */
  public fun decodeDbcsPair(leadByte: Int, trailByte: Int): String?
}
```

The inspector can then accept either this interface directly or an `XCharset`
and fail clearly when the charset does not support DBCS diagnostics.

```kotlin
public fun inspectEbcdicDbcs(
  charset: XEbcdicDbcsCharset,
  bytes: ByteArray,
  options: EbcdicDbcsInspectionOptions = EbcdicDbcsInspectionOptions(),
): EbcdicDbcsInspectionResult
```

Options:

```kotlin
public data class EbcdicDbcsInspectionOptions(
  val ambiguousExclusions: Set<Int> = defaultAmbiguousExclusions(),
  val inferMissingShiftOut: Boolean = true,
  val emitNeutralEvents: Boolean = true,
)

public fun dbcsPairKey(leadByte: Int, trailByte: Int): Int =
  ((leadByte and 0xFF) shl 8) or (trailByte and 0xFF)
```

## Diagnostic event model

```kotlin
public enum class EbcdicDbcsDiagnosticKind {
  SO,
  SI,
  SBCS,
  DBCS,
  DBCS_AMBIGUOUS,
  MISSING_SO,
  MISSING_SI,
  MISSING_SI_AT_EOF,
  UNMATCHED_SO,
  UNMATCHED_SI,
  INVALID_OR_UNKNOWN,
}

public enum class EbcdicDbcsSeverity {
  INFO,
  WARNING,
  ERROR,
}

public data class EbcdicDbcsDiagnosticEvent(
  val kind: EbcdicDbcsDiagnosticKind,
  val severity: EbcdicDbcsSeverity,
  val offset: Int,
  val length: Int,
  val startOrdinal: Int,
  val endOrdinal: Int,
  val bytesHex: String,
  val decodedText: String?,
  val message: String,
)

public data class EbcdicDbcsInspectionResult(
  val events: List<EbcdicDbcsDiagnosticEvent>,
  val counts: Map<EbcdicDbcsDiagnosticKind, Int>,
  val hasProblems: Boolean,
)
```

Severity guidance:

- `SO`, `SI`, `SBCS`, and `DBCS` are informational events.
- `DBCS_AMBIGUOUS` is a warning.
- Missing or unmatched shift events and invalid bytes are errors.

Callers that only need problem summaries can set `emitNeutralEvents = false`.
Editor-like tools can keep neutral events to highlight inferred DBCS spans after
a missing SO.

## Inspection principles

The inspector should scan raw bytes from left to right with an explicit current
mode. The initial mode is SBCS.

In SBCS mode:

- `SO` enters DBCS mode.
- `SI` is `UNMATCHED_SI`.
- A byte pair that is valid DBCS and also plausible SBCS is
  `DBCS_AMBIGUOUS`.
- A byte pair that is valid DBCS but not plausible SBCS indicates
  `MISSING_SO`, then the scanner enters inferred DBCS mode.
- Common filler pairs can be excluded from `DBCS_AMBIGUOUS` by option.

In DBCS mode:

- `SI` returns to SBCS mode.
- `SO` is `UNMATCHED_SO`.
- A valid DBCS pair is `DBCS`.
- A strong SBCS byte indicates `MISSING_SI`, then the scanner returns to SBCS.
- End of input while still in DBCS mode is `MISSING_SI_AT_EOF`.

For missing-SO detection, the inspector should keep a pending run of ambiguous
DBCS candidates. If a later stronger DBCS-only pair appears, report one
`MISSING_SO` at the first pending pair and reclassify the rest of the run as
inferred `DBCS`. This avoids reporting every character in a likely missing-SO
run as a separate problem.

Private Use Area mappings should not create `DBCS_AMBIGUOUS` warnings by
default, because they are often compatibility or non-roundtrip artifacts and
can create noisy diagnostics in source-like files.

## IBM-937 examples

These examples use byte values that have been validated in the IBM Z HEX ON
Editor diagnostics tests.

Valid explicit DBCS run:

```kotlin
val bytes = byteArrayOf(
  0x0E,       // SO
  0x5A, 0x61,
  0x5D, 0x7C,
  0x0F,       // SI
)

val result = inspectEbcdicDbcs(IBM937, bytes)

// Expected:
// hasProblems = false
// counts[SO] = 1
// counts[DBCS] = 2
// counts[SI] = 1
// counts[DBCS_AMBIGUOUS] = 0
```

Ambiguous DBCS candidates in SBCS mode:

```kotlin
val bytes = byteArrayOf(
  0x5A, 0x61,
  0x5D, 0x7C,
)

val result = inspectEbcdicDbcs(IBM937, bytes)

// Expected:
// hasProblems = false
// counts[DBCS_AMBIGUOUS] = 2
```

Missing SO before a DBCS run:

```kotlin
val bytes = byteArrayOf(
  0x5A, 0x61, // initially ambiguous in SBCS mode
  0x5D, 0x7C, // initially ambiguous in SBCS mode
  0x44, 0x81, // stronger DBCS-only signal
)
val result = inspectEbcdicDbcs(IBM937, bytes)

// Expected:
// hasProblems = true
// first problem event:
//   kind = MISSING_SO
//   offset = 0
//   bytesHex = "5A 61"
// counts[DBCS] = 2
// counts[DBCS_AMBIGUOUS] = 0
// Later bytes in the inferred run are emitted as DBCS events.
```

Noise suppression for filler bytes:

```kotlin
val bytes = byteArrayOf(0x40, 0x40, 0x5C, 0x5C)
val result = inspectEbcdicDbcs(IBM937, bytes)

// With default exclusions:
// counts[DBCS_AMBIGUOUS] = 0
// counts[SBCS] = 4
```

Custom exclusions:

```kotlin
val options = EbcdicDbcsInspectionOptions(
  ambiguousExclusions = setOf(dbcsPairKey(0x5A, 0x61)),
)

val result = inspectEbcdicDbcs(
  IBM937,
  byteArrayOf(0x5A, 0x61),
  options,
)

// Expected:
// counts[DBCS_AMBIGUOUS] = 0
// counts[SBCS] = 2
```

## Suggested PR sequence

1. Add `XEbcdicDbcsCharset` metadata/lookup capability and implement it for
   existing generated DBCS charsets.
2. Add the inspector event model and scanner with tests for IBM-937.
3. Add tests for IBM-930, IBM-939, IBM-1390, and IBM-1399.
4. Decide whether diagnostics should be exported through the JS package.
5. Add mapping-source reconciliation tooling and reports before introducing new
   or revised mapping data.
6. Consider adding IBM-933, IBM-935, IBM-1364, IBM-1371, and IBM-1388 using
   traceable mapping sources and the existing generator approach.

## Mapping reconciliation plan

Mapping reconciliation should be treated as a separate contribution track from
diagnostics. Diagnostics can use the currently supported `kotlinx-charset`
tables first, while reconciliation provides a safer path for adding or revising
mapping data later.

Potential sources to reconcile:

- Existing `kotlinx-charset` `.map`, `.nr`, and `.c2b` files.
- ICU `.ucm` sources pinned by URL and revision.
- JVM charset output, where it is useful as a comparison source rather than the
  final authority.
- IBM or Unicode source revisions accepted by the maintainers.

Recommended normalized row shape:

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

The reconciliation tool should produce reports before generating new tables:

- `same`: all sources agree.
- `onlyInCurrent`: present only in current `kotlinx-charset` mappings.
- `onlyInCandidate`: present only in a candidate source such as ICU.
- `conflict`: the same bytes map to different Unicode code points, or the same
  Unicode sequence maps to different byte sequences.
- `fallbackOnly`: present only as fallback or substitution data.
- `privateUse`: maps to Unicode Private Use Area and may require diagnostics
  suppression policy.
- `baseOverlay`: resolved from an ICU `<icu:base>` relationship.

The merge policy should be explicit and reviewed. Suggested defaults:

- Prefer roundtrip mappings over fallback mappings for encode/decode.
- Keep fallback mappings out of reverse encoding unless maintainers explicitly
  choose otherwise.
- Preserve non-roundtrip mappings in the existing `.nr` / `.c2b` style when they
  are needed to match current behavior.
- Preserve Private Use Area mappings for decoding when they are already part of
  a supported charset, but exclude them from default ambiguous-DBCS warnings.
- Resolve base mappings first, then overlay derived code-page deltas.

This track could be delivered as:

1. A report-only Gradle or CLI task that reads current mappings plus candidate
   ICU UCM files and writes JSON or Markdown diff reports.
2. Maintainer-reviewed merge policy.
3. Generator updates that emit `.map`, `.nr`, and `.c2b` files or generated
   Kotlin source from the reconciled model.
4. Focused charset additions or corrections after the reports are accepted.

## Open questions for maintainers

- Should diagnostics live in the existing `ebcdic` module or in a separate
  optional module?
- Should generated charset objects expose DBCS lookup helpers publicly, or
  should the inspector stay inside the `ebcdic` package and use internal tables?
- Should `emitNeutralEvents` default to true for editor use cases, or false for
  lower-memory batch validation?
- Which default ambiguous exclusions are acceptable as library defaults?
- Should JS exports include diagnostics in the first implementation or wait for
  a follow-up release?
- Should mapping reconciliation live in the existing `ucm` / `ucm-cli` modules,
  in `buildSrc`, or in a separate tool module?
- What source hierarchy should be considered authoritative when ICU, current
  tables, and JVM charset behavior disagree?
