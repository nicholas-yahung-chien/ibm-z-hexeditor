# Mapping Table Sources

This note records the source strategy for adding IBM EBCDIC SBCS and DBCS code pages after the IBM-937 MVP.

## Recommended Source

Use ICU `.ucm` mapping files from the Unicode ICU repository as the primary source for generated tables.

Reasons:

- ICU documents `.ucm` as its text mapping-table format and states that ICU ships mapping files under `icu/source/data/mappings`.
- ICU `.ucm` headers identify single-byte code pages with `SBCS` and mixed host code pages with `EBCDIC_STATEFUL`.
- The ICU state table for `EBCDIC_STATEFUL` explicitly models SO/SI state shifts.
- IBM documents the target z/OS EBCDIC code pages with converter names that align with ICU mapping files.

Before vendoring generated tables into a product build, confirm licensing with the owning product/legal team. The ICU files include Unicode license references and IBM copyright notices. Generated files should preserve source URLs, source file names, and the ICU commit or release used to generate them.

## Initial Candidate Files

| Code page | Language/variant | ICU source file | Notes |
| --- | --- | --- | --- |
| IBM-037 | US/Canada EBCDIC SBCS | [`ibm-37_P100-1995.ucm`](https://github.com/unicode-org/icu/blob/177fbc931d8f7d929c077c2b2254b79a741a4fae/icu4c/source/data/mappings/ibm-37_P100-1995.ucm) | Enabled generated SBCS profile. |
| IBM-500 | International EBCDIC SBCS | [`ibm-500_P100-1995.ucm`](https://github.com/unicode-org/icu/blob/177fbc931d8f7d929c077c2b2254b79a741a4fae/icu4c/source/data/mappings/ibm-500_P100-1995.ucm) | Enabled generated SBCS profile. |
| IBM-1047 | Latin-1/Open Systems EBCDIC SBCS | [`ibm-1047_P100-1995.ucm`](https://github.com/unicode-org/icu/blob/177fbc931d8f7d929c077c2b2254b79a741a4fae/icu4c/source/data/mappings/ibm-1047_P100-1995.ucm) | Enabled generated SBCS profile. |
| IBM-1140 | US/Canada EBCDIC SBCS with Euro | [`ibm-1140_P100-1997.ucm`](https://github.com/unicode-org/icu/blob/177fbc931d8f7d929c077c2b2254b79a741a4fae/icu4c/source/data/mappings/ibm-1140_P100-1997.ucm) | Enabled generated SBCS profile. |
| IBM-930 | Japanese Katakana-Kanji host mixed | [`ibm-930_P120-1999.ucm`](https://github.com/unicode-org/icu/blob/177fbc931d8f7d929c077c2b2254b79a741a4fae/icu4c/source/data/mappings/ibm-930_P120-1999.ucm) | Enabled generated profile and likely base for IBM-939. |
| IBM-933 | Korean host mixed | [`ibm-933_P110-1995.ucm`](https://github.com/unicode-org/icu/blob/177fbc931d8f7d929c077c2b2254b79a741a4fae/icu4c/source/data/mappings/ibm-933_P110-1995.ucm) | Enabled generated Korean profile. |
| IBM-935 | Simplified Chinese host mixed | [`ibm-935_P110-1999.ucm`](https://github.com/unicode-org/icu/blob/177fbc931d8f7d929c077c2b2254b79a741a4fae/icu4c/source/data/mappings/ibm-935_P110-1999.ucm) | Enabled generated Simplified Chinese profile. |
| IBM-937 | Traditional Chinese host mixed | [`ibm-937_P110-1999.ucm`](https://github.com/unicode-org/icu/blob/177fbc931d8f7d929c077c2b2254b79a741a4fae/icu4c/source/data/mappings/ibm-937_P110-1999.ucm) | Current MVP baseline should eventually be generated from the same workflow. ICU declares `<icu:base> "ibm-1371_P100-1999"`. |
| IBM-939 | Japanese Latin-Kanji host mixed | [`ibm-939_P120-1999.ucm`](https://github.com/unicode-org/icu/blob/177fbc931d8f7d929c077c2b2254b79a741a4fae/icu4c/source/data/mappings/ibm-939_P120-1999.ucm) | The ICU file declares `<icu:base> "ibm-930_P120-1999"`, so the generator must load and overlay the base table. |
| IBM-1364 | Korean host mixed extended | [`ibm-1364_P110-2007.ucm`](https://github.com/unicode-org/icu/blob/177fbc931d8f7d929c077c2b2254b79a741a4fae/icu4c/source/data/mappings/ibm-1364_P110-2007.ucm) | Enabled generated Korean profile with full Hangul coverage. IBM documentation may refer to the ODBC converter as `ibm-1364_P110-1997`; the pinned ICU file is `P110-2007`. |
| IBM-1371 | Traditional Chinese host mixed extended | [`ibm-1371_P100-1999.ucm`](https://github.com/unicode-org/icu/blob/177fbc931d8f7d929c077c2b2254b79a741a4fae/icu4c/source/data/mappings/ibm-1371_P100-1999.ucm) | Enabled generated Traditional Chinese profile and base source for IBM-937. |
| IBM-1388 | Simplified Chinese GB 18030 host | [`ibm-1388_P100-2024.ucm`](https://github.com/unicode-org/icu/blob/177fbc931d8f7d929c077c2b2254b79a741a4fae/icu4c/source/data/mappings/ibm-1388_P100-2024.ucm) | Enabled generated Simplified Chinese profile. IBM documentation may refer to the ODBC converter as `ibm-1388_P103-2001`; the pinned ICU file is `P100-2024`. |
| IBM-1390 | Extended Japanese Katakana-Kanji host mixed | [`ibm-1390_P110-2003.ucm`](https://github.com/unicode-org/icu/blob/177fbc931d8f7d929c077c2b2254b79a741a4fae/icu4c/source/data/mappings/ibm-1390_P110-2003.ucm) | Enabled generated JIS X0213 Japanese profile. |
| IBM-1399 | Extended Japanese Latin-Kanji host mixed | [`ibm-1399_P110-2003.ucm`](https://github.com/unicode-org/icu/blob/177fbc931d8f7d929c077c2b2254b79a741a4fae/icu4c/source/data/mappings/ibm-1399_P110-2003.ucm) | Enabled generated JIS X0213 Japanese profile over IBM-1390. |

## Prototype Inspection Results

The prototype script `scripts/inspect-ucm-mapping.mjs` reads local or remote `.ucm` files and reports mapping-entry counts. Early checks against ICU commit `177fbc931d8f7d929c077c2b2254b79a741a4fae` showed that the initial files are parseable into one-byte and two-byte mappings.

| File | UCM class | One-byte mappings | Two-byte mappings | Base |
| --- | --- | ---: | ---: | --- |
| `ibm-37_P100-1995.ucm` | `SBCS` | 352 | 0 | none |
| `ibm-500_P100-1995.ucm` | `SBCS` | 352 | 0 | none |
| `ibm-1047_P100-1995.ucm` | `SBCS` | 351 | 0 | none |
| `ibm-1140_P100-1997.ucm` | `SBCS` | 351 | 0 | none |
| `ibm-930_P120-1999.ucm` | `EBCDIC_STATEFUL` | 335 | 11,680 | none |
| `ibm-933_P110-1995.ucm` | `EBCDIC_STATEFUL` | 279 | 10,763 | none |
| `ibm-935_P110-1999.ucm` | `EBCDIC_STATEFUL` | 236 | 9,358 | none |
| `ibm-937_P110-1999.ucm` | `EBCDIC_STATEFUL` | 246 | 20,269 | `ibm-1371_P100-1999` |
| `ibm-939_P120-1999.ucm` | `EBCDIC_STATEFUL` | 335 | 11,680 | `ibm-930_P120-1999` |
| `ibm-1364_P110-2007.ucm` | `EBCDIC_STATEFUL` | 230 | 19,557 | none |
| `ibm-1371_P100-1999.ucm` | `EBCDIC_STATEFUL` | 247 | 20,270 | none |
| `ibm-1388_P100-2024.ucm` | `EBCDIC_STATEFUL` | 236 | 32,804 | none |
| `ibm-1390_P110-2003.ucm` | `EBCDIC_STATEFUL` | 237 | 22,109 | none |
| `ibm-1399_P110-2003.ucm` | `EBCDIC_STATEFUL` | 237 | 22,109 | `ibm-1390_P110-2003` |

Counts are not final generated-table counts. The generator still needs canonical reverse-map selection, fallback handling, Private Use Area handling, and base-table overlay support.

## Generation Plan

Add a generator that reads ICU `.ucm` files and emits TypeScript mapping tables used by `IbmDbcsProfile`.

Recommended steps:

1. Record each source file in a manifest with code page id, ICU URL, source revision, and base file if any.
2. Parse the `.ucm` header and require `uconv_class` to be `SBCS` or `EBCDIC_STATEFUL` for these profiles.
3. Parse `CHARMAP` rows into byte sequences and Unicode code points.
4. Split one-byte rows into `sbcsToUnicode` and `unicodeToSbcs`.
5. Split two-byte rows into `dbcsToUnicode` and `unicodeToDbcs`.
6. Preserve only canonical roundtrip mappings first. Treat fallback mappings as an explicit follow-up decision.
7. Resolve `<icu:base>` by loading the base source first and overlaying the delta file.
8. Preserve Private Use Area mappings for preview, but keep the current diagnostics rule that PUA mappings do not create DBCS ambiguous warnings.
9. Generate compact tables plus a source banner containing the source file name, URL, and revision.
10. Add fixtures and roundtrip tests before enabling a code page in the picker.

The first generator implementation is available as `scripts/generate-ucm-tables.mjs`, with candidate sources listed in `scripts/ucm-manifest.json`.

Common commands:

```sh
node scripts/generate-ucm-tables.mjs --profile ibm939 --dry-run
node scripts/generate-ucm-tables.mjs --all --dry-run
node scripts/generate-ucm-tables.mjs --profile ibm37 --profile ibm500 --profile ibm1047 --profile ibm1140 --out-dir src/codec/generated
node scripts/generate-ucm-tables.mjs --profile ibm930 --profile ibm933 --profile ibm935 --profile ibm939 --out-dir src/codec/generated
node scripts/generate-ucm-tables.mjs --profile ibm1364 --profile ibm1371 --profile ibm1388 --profile ibm1390 --profile ibm1399 --dry-run
node scripts/generate-ucm-tables.mjs --profile ibm1364 --profile ibm1371 --profile ibm1388 --profile ibm1390 --profile ibm1399 --out-dir src/codec/generated
```

By default, the generator keeps only canonical `|0` mappings and skips fallback mappings. Use `--include-fallback` only after deciding how fallback rows should behave for preview and reverse encoding.

Dry-run generated-table counts from ICU commit `177fbc931d8f7d929c077c2b2254b79a741a4fae`:

| Profile | Source chain | SBCS mappings | DBCS mappings |
| --- | --- | ---: | ---: |
| IBM-037 | `ibm-37_P100-1995.ucm` | 256 | 0 |
| IBM-500 | `ibm-500_P100-1995.ucm` | 256 | 0 |
| IBM-1047 | `ibm-1047_P100-1995.ucm` | 256 | 0 |
| IBM-1140 | `ibm-1140_P100-1997.ucm` | 256 | 0 |
| IBM-930 | `ibm-930_P120-1999.ucm` | 226 | 11,635 |
| IBM-933 | `ibm-933_P110-1995.ucm` | 215 | 10,757 |
| IBM-935 | `ibm-935_P110-1999.ucm` | 163 | 9,356 |
| IBM-1364 | `ibm-1364_P110-2007.ucm` | 215 | 19,551 |
| IBM-1371 | `ibm-1371_P100-1999.ucm` | 162 | 20,075 |
| IBM-937 | `ibm-1371_P100-1999.ucm` + `ibm-937_P110-1999.ucm` | 162 | 20,075 |
| IBM-939 | `ibm-930_P120-1999.ucm` + `ibm-939_P120-1999.ucm` | 229 | 11,635 |
| IBM-1388 | `ibm-1388_P100-2024.ucm` | 163 | 32,667 |
| IBM-1390 | `ibm-1390_P110-2003.ucm` | 227 | 22,076 |
| IBM-1399 | `ibm-1390_P110-2003.ucm` + `ibm-1399_P110-2003.ucm` | 230 | 22,076 |

## Validation Plan

For each new profile:

- verify that known language samples decode correctly;
- verify Unicode-to-byte and byte-to-Unicode roundtrips for representative SBCS and DBCS characters;
- verify that SBCS-only profiles preview bytes without DBCS diagnostics;
- verify SO/SI diagnostics with valid DBCS spans, missing SO, missing SI, odd DBCS byte counts, and inserted/deleted bytes for DBCS profiles;
- verify that source-like SBCS filler data does not create noisy DBCS ambiguous warnings;
- compare selected samples with ICU output where a local ICU converter is available.

## Open Questions

- Should IBM-937 be regenerated together with IBM-1371 so the existing hand-curated table can be retired safely?
- Should fallback mappings be included for preview only, reverse encoding, both, or neither?
- Do any target profiles need profile-specific ambiguity suppression beyond the current PUA and obvious-SBCS rules?
- Should generated tables be committed directly, or should the repository commit only the generator plus a pinned source manifest?

## Source References

- [ICU conversion data documentation](https://unicode-org.github.io/icu/userguide/conversion/data.html)
- [IBM z/OS DBCS code page requirements](https://www.ibm.com/docs/en/idr/11.4.0?topic=source-code-page-requirements)
- [Unicode ICU repository](https://github.com/unicode-org/icu)
