Hi! We have been building an IBM Z HEX ON style editor for VS Code, focused on editing raw EBCDIC bytes while showing decoded text and SO/SI diagnostics for stateful DBCS code pages. The work made us think that part of the byte-stream inspection logic may be useful as a reusable `kotlinx-charset` utility.

This proposal is intentionally separate from normal decoding/encoding behavior. I am **not** proposing that `XCharsetDecoder` should auto-repair malformed streams or infer missing SO/SI. Instead, the idea is to add an optional inspection API that tools can run on raw bytes before or alongside decoding.

## Motivation

For EBCDIC DBCS charsets, malformed SO/SI structure is common in real files and difficult for users to diagnose visually. A decoder can either replace or throw, but editor and migration tools often need more structured information:

- where the stream enters or exits DBCS mode;
- whether an `SI` appears while already in SBCS mode;
- whether an `SO` appears while already in DBCS mode;
- whether a valid DBCS-looking run appears while still in SBCS mode, suggesting a missing `SO`;
- whether a strong SBCS byte appears while in DBCS mode, suggesting a missing `SI`;
- whether a byte pair is valid DBCS but also plausible SBCS, making it ambiguous rather than necessarily wrong;
- byte offsets and lengths for editor highlights, quick fixes, and navigation.

## Proposed API shape

One possible approach is to expose a small DBCS capability interface implemented by generated EBCDIC DBCS charset objects:

```kotlin
public interface XEbcdicDbcsCharset : XCharset {
  public val shiftOut: Byte
  public val shiftIn: Byte
  public val trailByteRange: IntRange

  public fun decodeSbcsByte(byte: Int): String?
  public fun decodeDbcsPair(leadByte: Int, trailByte: Int): String?
}
```

Then diagnostics could be provided as:

```kotlin
public fun inspectEbcdicDbcs(
  charset: XEbcdicDbcsCharset,
  bytes: ByteArray,
  options: EbcdicDbcsInspectionOptions = EbcdicDbcsInspectionOptions(),
): EbcdicDbcsInspectionResult
```

Options could include:

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
- Missing/unmatched shift events and invalid bytes are errors.

Callers that only need problem summaries could set `emitNeutralEvents = false`. Editor-like tools can keep neutral events to highlight inferred DBCS spans after a missing `SO`.

## Inspection principles

The inspector would scan raw bytes from left to right with an explicit current mode. The initial mode is SBCS.

In SBCS mode:

- `SO` enters DBCS mode.
- `SI` is `UNMATCHED_SI`.
- A byte pair that is valid DBCS and also plausible SBCS is `DBCS_AMBIGUOUS`.
- A byte pair that is valid DBCS but not plausible SBCS indicates `MISSING_SO`, then the scanner enters inferred DBCS mode.
- Common filler pairs can be excluded from `DBCS_AMBIGUOUS` by option.

In DBCS mode:

- `SI` returns to SBCS mode.
- `SO` is `UNMATCHED_SO`.
- A valid DBCS pair is `DBCS`.
- A strong SBCS byte indicates `MISSING_SI`, then the scanner returns to SBCS.
- End of input while still in DBCS mode is `MISSING_SI_AT_EOF`.

For missing-SO detection, the inspector can keep a pending run of ambiguous DBCS candidates. If a later stronger DBCS-only pair appears, it reports one `MISSING_SO` at the first pending pair and reclassifies the rest of the run as inferred `DBCS`. This avoids reporting every character in a likely missing-SO run as a separate structural problem.

Private Use Area mappings should not create `DBCS_AMBIGUOUS` warnings by default, because they are often compatibility or non-roundtrip artifacts and can create noisy diagnostics in source-like files.

## IBM-937 examples

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

## Questions

- Would this fit best in the existing `ebcdic` module, or would you prefer a separate optional diagnostics module?
- Would you be open to generated DBCS charset objects exposing lookup helpers such as `decodeSbcsByte` and `decodeDbcsPair`?
- Should `emitNeutralEvents` default to true for editor tooling, or false for smaller batch-validation output?
- Which default ambiguous exclusions would be acceptable as library defaults?
- Should JS exports include this diagnostics API in the first implementation or wait for a follow-up?

If this direction sounds acceptable, I can prepare a small PR focused on IBM-937 first, without changing existing encode/decode behavior.
