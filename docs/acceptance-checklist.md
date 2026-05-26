# Acceptance Checklist

Use this checklist before sharing a VSIX build or cutting an MVP release candidate.

## 1. Build And Package

- [ ] Run `npm install` after pulling new dependency changes.
- [ ] Run `npm run type-check`.
- [ ] Run `npm test`.
- [ ] Run `npm run package:vsix`.
- [ ] Confirm `dist/ibm-z-hex-on-editor.vsix` exists.
- [ ] Confirm the package command finishes without warnings that require action.
- [ ] Run `npx vsce ls --tree`.
- [ ] Confirm the VSIX does not include `test/`, `test/fixtures/`, `.tmp/`, `scripts/`, source files, logs, or unrelated dependency development files.
- [ ] Confirm the VSIX includes `dist/codicons/codicon.css` and `dist/codicons/codicon.ttf` for webview icon rendering.

## 2. Install The VSIX

Recommended clean-profile command:

```powershell
$profile = ".tmp\vscode-hex-on-profile"
$extensions = ".tmp\vscode-hex-on-extensions"
code --user-data-dir $profile --extensions-dir $extensions --install-extension dist\ibm-z-hex-on-editor.vsix
code --user-data-dir $profile --extensions-dir $extensions .
```

Manual alternative:

1. Open VS Code.
2. Run `Extensions: Install from VSIX...`.
3. Choose `dist/ibm-z-hex-on-editor.vsix`.
4. Reload VS Code when prompted.

Expected:

- [ ] Extension installs successfully.
- [ ] Command Palette contains `IBM Z Hex Editor: Open HEX ON`.
- [ ] Settings UI contains `IBM Z HEX ON Editor` settings.

## 3. Prepare Manual Test Files

Do not edit committed fixtures directly during manual acceptance. Copy them first:

```powershell
New-Item -ItemType Directory -Force .tmp\manual | Out-Null
Copy-Item test\fixtures\SOAIPB1.ibm937.cpy .tmp\manual\SOAIPB1.acceptance.ibm937.cpy -Force
Copy-Item test\fixtures\SOAIPB1.ibm930.cpy .tmp\manual\SOAIPB1.acceptance.ibm930.cpy -Force
Copy-Item test\fixtures\SOAIPB1.ibm933.cpy .tmp\manual\SOAIPB1.acceptance.ibm933.cpy -Force
Copy-Item test\fixtures\SOAIPB1.ibm935.cpy .tmp\manual\SOAIPB1.acceptance.ibm935.cpy -Force
Copy-Item test\fixtures\SOAIPB1.ibm939.cpy .tmp\manual\SOAIPB1.acceptance.ibm939.cpy -Force
Copy-Item test\fixtures\SOAIPB1.ibm1364.cpy .tmp\manual\SOAIPB1.acceptance.ibm1364.cpy -Force
Copy-Item test\fixtures\SOAIPB1.ibm1371.cpy .tmp\manual\SOAIPB1.acceptance.ibm1371.cpy -Force
Copy-Item test\fixtures\SOAIPB1.ibm1388.cpy .tmp\manual\SOAIPB1.acceptance.ibm1388.cpy -Force
Copy-Item test\fixtures\SOAIPB1.ibm1390.cpy .tmp\manual\SOAIPB1.acceptance.ibm1390.cpy -Force
Copy-Item test\fixtures\SOAIPB1.ibm1399.cpy .tmp\manual\SOAIPB1.acceptance.ibm1399.cpy -Force
Copy-Item test\fixtures\HELLO.ibm37.cpy .tmp\manual\HELLO.acceptance.ibm37.cpy -Force
Copy-Item test\fixtures\HELLO.ibm500.cpy .tmp\manual\HELLO.acceptance.ibm500.cpy -Force
Copy-Item test\fixtures\HELLO.ibm1047.cpy .tmp\manual\HELLO.acceptance.ibm1047.cpy -Force
Copy-Item test\fixtures\HELLO.ibm1140.cpy .tmp\manual\HELLO.acceptance.ibm1140.cpy -Force
Copy-Item test\fixtures\SOAIPB1.ibm937.stress-1200.cpy .tmp\manual\SOAIPB1.acceptance.ibm937.stress-1200.cpy -Force
```

Expected:

- [ ] `.tmp/manual/SOAIPB1.acceptance.ibm937.cpy` exists.
- [ ] `.tmp/manual/SOAIPB1.acceptance.ibm930.cpy` exists.
- [ ] `.tmp/manual/SOAIPB1.acceptance.ibm933.cpy` exists.
- [ ] `.tmp/manual/SOAIPB1.acceptance.ibm935.cpy` exists.
- [ ] `.tmp/manual/SOAIPB1.acceptance.ibm939.cpy` exists.
- [ ] `.tmp/manual/SOAIPB1.acceptance.ibm1364.cpy` exists.
- [ ] `.tmp/manual/SOAIPB1.acceptance.ibm1371.cpy` exists.
- [ ] `.tmp/manual/SOAIPB1.acceptance.ibm1388.cpy` exists.
- [ ] `.tmp/manual/SOAIPB1.acceptance.ibm1390.cpy` exists.
- [ ] `.tmp/manual/SOAIPB1.acceptance.ibm1399.cpy` exists.
- [ ] `.tmp/manual/HELLO.acceptance.ibm37.cpy` exists.
- [ ] `.tmp/manual/HELLO.acceptance.ibm500.cpy` exists.
- [ ] `.tmp/manual/HELLO.acceptance.ibm1047.cpy` exists.
- [ ] `.tmp/manual/HELLO.acceptance.ibm1140.cpy` exists.
- [ ] `.tmp/manual/SOAIPB1.acceptance.ibm937.stress-1200.cpy` exists.
- [ ] `git status --short` remains clean before manual editing begins.

## 4. Open HEX ON

1. Open `.tmp/manual/SOAIPB1.acceptance.ibm937.cpy` in VS Code.
2. Run `IBM Z Hex Editor: Open HEX ON`.
3. Choose `IBM-937` as the actual file-content encoding.

Expected:

- [ ] Custom editor opens.
- [ ] Header shows the file name.
- [ ] Header shows `ibm937`, `raw bytes`, and byte count.
- [ ] The editor shows raw hex bytes, not Unicode text bytes.
- [ ] The preview row decodes the IBM-937 content.
- [ ] The encoding picker describes IBM DBCS choices by language, such as Korean, Simplified Chinese, Traditional Chinese, and Japanese.
- [ ] Encoding picker descriptions are short enough to scan without relying on repeated tooltip text.

## 5. IBM EBCDIC Code Page Baselines

### IBM SBCS

Open each copied `HELLO.acceptance.*.cpy` file with its matching encoding:

- `.tmp/manual/HELLO.acceptance.ibm37.cpy` as IBM-037
- `.tmp/manual/HELLO.acceptance.ibm500.cpy` as IBM-500
- `.tmp/manual/HELLO.acceptance.ibm1047.cpy` as IBM-1047
- `.tmp/manual/HELLO.acceptance.ibm1140.cpy` as IBM-1140

Expected:

- [ ] Header shows the selected `ibm37`, `ibm500`, `ibm1047`, or `ibm1140` encoding id.
- [ ] The preview row shows `HELLO WORLD` and `ABC` split by the EBCDIC newline byte.
- [ ] IBM-1140 additionally previews the Euro sign between `WORLD` and the newline.
- [ ] No SO/SI diagnostics strip is shown for SBCS-only files.

### IBM-937

With `.tmp/manual/SOAIPB1.acceptance.ibm937.cpy` opened as IBM-937:

- [ ] Diagnostics summary shows `SO/SI structure valid`.
- [ ] Diagnostics summary shows `4 DBCS pair(s)`.
- [ ] Diagnostics summary shows `27 warning(s)`.
- [ ] Expanding diagnostics shows `SO 1`, `SI 1`, `DBCS 4`, and `DBCS ambiguous 27`.
- [ ] `DBCS ambiguous` locations do not include repeated `5C 5C` COBOL comment asterisks.

### IBM-930

Open `.tmp/manual/SOAIPB1.acceptance.ibm930.cpy` as IBM-930.

Expected:

- [ ] Header shows `ibm930`.
- [ ] Diagnostics summary shows `SO/SI structure valid`.
- [ ] Diagnostics summary shows `4 DBCS pair(s)`.
- [ ] The explicit DBCS preview text is `?交隤?`.
- [ ] Expanding diagnostics shows `SO 1`, `SI 1`, and `DBCS 4`.

### IBM-933

Open `.tmp/manual/SOAIPB1.acceptance.ibm933.cpy` as IBM-933.

Expected:

- [ ] Header shows `ibm933`.
- [ ] Diagnostics summary shows `SO/SI structure valid`.
- [ ] Diagnostics summary shows `4 DBCS pair(s)`.
- [ ] The explicit DBCS preview text is `?筏?渠爰`.
- [ ] Expanding diagnostics shows `SO 1`, `SI 1`, and `DBCS 4`.

### IBM-935

Open `.tmp/manual/SOAIPB1.acceptance.ibm935.cpy` as IBM-935.

Expected:

- [ ] Header shows `ibm935`.
- [ ] Diagnostics summary shows `SO/SI structure valid`.
- [ ] Diagnostics summary shows `4 DBCS pair(s)`.
- [ ] The explicit DBCS preview text is `銝剜?瘚?`.
- [ ] Expanding diagnostics shows `SO 1`, `SI 1`, and `DBCS 4`.

### IBM-939

Open `.tmp/manual/SOAIPB1.acceptance.ibm939.cpy` as IBM-939.

Expected:

- [ ] Header shows `ibm939`.
- [ ] Diagnostics summary shows `SO/SI structure valid`.
- [ ] Diagnostics summary shows `4 DBCS pair(s)`.
- [ ] The explicit DBCS preview text is `?交隤?`.
- [ ] Expanding diagnostics shows `SO 1`, `SI 1`, and `DBCS 4`.

### IBM-1364

Open `.tmp/manual/SOAIPB1.acceptance.ibm1364.cpy` as IBM-1364.

Expected:

- [ ] Header shows `ibm1364`.
- [ ] Diagnostics summary shows `SO/SI structure valid`.
- [ ] Diagnostics summary shows `4 DBCS pair(s)`.
- [ ] The explicit DBCS preview text is `한국어문`.
- [ ] Expanding diagnostics shows `SO 1`, `SI 1`, and `DBCS 4`.

### IBM-1371

Open `.tmp/manual/SOAIPB1.acceptance.ibm1371.cpy` as IBM-1371.

Expected:

- [ ] Header shows `ibm1371`.
- [ ] Diagnostics summary shows `SO/SI structure valid`.
- [ ] Diagnostics summary shows `4 DBCS pair(s)`.
- [ ] The explicit DBCS preview text is `測試一下`.
- [ ] Expanding diagnostics shows `SO 1`, `SI 1`, and `DBCS 4`.

### IBM-1388

Open `.tmp/manual/SOAIPB1.acceptance.ibm1388.cpy` as IBM-1388.

Expected:

- [ ] Header shows `ibm1388`.
- [ ] Diagnostics summary shows `SO/SI structure valid`.
- [ ] Diagnostics summary shows `4 DBCS pair(s)`.
- [ ] The explicit DBCS preview text is `中国汉字`.
- [ ] Expanding diagnostics shows `SO 1`, `SI 1`, and `DBCS 4`.

### IBM-1390

Open `.tmp/manual/SOAIPB1.acceptance.ibm1390.cpy` as IBM-1390.

Expected:

- [ ] Header shows `ibm1390`.
- [ ] Diagnostics summary shows `SO/SI structure valid`.
- [ ] Diagnostics summary shows `4 DBCS pair(s)`.
- [ ] The explicit DBCS preview text is `日本語文`.
- [ ] Expanding diagnostics shows `SO 1`, `SI 1`, and `DBCS 4`.

### IBM-1399

Open `.tmp/manual/SOAIPB1.acceptance.ibm1399.cpy` as IBM-1399.

Expected:

- [ ] Header shows `ibm1399`.
- [ ] Diagnostics summary shows `SO/SI structure valid`.
- [ ] Diagnostics summary shows `4 DBCS pair(s)`.
- [ ] The explicit DBCS preview text is `日本語文`.
- [ ] Expanding diagnostics shows `SO 1`, `SI 1`, and `DBCS 4`.

## 6. DBCS Ambiguous Exclusion Settings

Use the copied IBM-937 fixture.

1. Open VS Code user settings JSON.
2. Add `"ibmZHexEditor.dbcsAmbiguousExclusionsEnabled": true`.
3. Open or reload the IBM-937 file in HEX ON.

Expected:

- [ ] The extension writes `ibmZHexEditor.dbcsAmbiguousExclusions` into user settings JSON if it was empty.
- [ ] The seeded settings include `40 40` and `5C 5C`.
- [ ] With the defaults seeded, repeated `5C 5C` pairs are not reported as `DBCS ambiguous`.
- [ ] If `ibmZHexEditor.dbcsAmbiguousExclusions` is explicitly set to `[]`, the extension respects the empty list and does not seed defaults again.

Then edit user settings JSON:

```json
"ibmZHexEditor.dbcsAmbiguousExclusions": [
  { "bytes": "40 40", "label": "EBCDIC spaces" },
  { "bytes": "5A 61", "label": "Test suppression" }
]
```

Expected:

- [ ] The active HEX ON editor updates diagnostics without requiring VS Code restart.
- [ ] `5A 61` is no longer reported as `DBCS ambiguous` when present in SBCS mode.
- [ ] Because `5C 5C` was removed from the custom list, repeated `5C 5C` pairs may be reported again if they are valid ambiguous candidates.

Add an invalid rule:

```json
{ "bytes": "not hex", "label": "Invalid" }
```

Expected:

- [ ] The extension shows a warning about the invalid rule.
- [ ] Diagnostics continue to work.

Finally set `"ibmZHexEditor.dbcsAmbiguousExclusionsEnabled": false`.

Expected:

- [ ] Built-in exclusions are used again.
- [ ] Diagnostics update without requiring VS Code restart.

## 7. Unsupported IBM Encoding Warning

1. Open any copied fixture in VS Code.
2. Run `IBM Z Hex Editor: Open HEX ON`.
3. Choose `Enter another encoding...`.
4. Enter `cp273`.

Expected:

- [ ] A warning explains that `cp273` is not yet supported for code-page-aware preview.
- [ ] The warning says raw byte editing can still continue with generic fallback behavior.
- [ ] Canceling the warning keeps the HEX ON editor from opening with the unsupported IBM encoding.
- [ ] Choosing `Use Anyway` opens the HEX ON editor with the chosen encoding id.

## 8. Diagnostics Navigation

1. Expand the diagnostics panel.
2. Click the `DBCS ambiguous` category.
3. Click a location button.
4. Use `Previous` and `Next`.
5. Clear the filter.

Expected:

- [ ] Clicking a location moves the active byte/nibble to that diagnostic.
- [ ] The target row scrolls into view.
- [ ] Active diagnostic location remains visibly selected.
- [ ] Previous/Next cycles through filtered diagnostics.
- [ ] Clear filter restores all jumpable diagnostic categories.

## 9. Nibble Editing

1. Move to a safe byte in the copied file.
2. Type a hex digit `0` to `9` or `A` to `F`.
3. Move with arrow keys.

Expected:

- [ ] Only the active nibble changes.
- [ ] Header status changes to `Modified`.
- [ ] Byte count does not change.
- [ ] Preview and diagnostics update immediately.

## 10. Insert And Delete

1. Press `Insert`.
2. Confirm byte `00` is inserted at the active position.
3. Press `Delete` or `Backspace`.

Expected:

- [ ] Byte count increases by 1 after insert.
- [ ] Byte count returns after delete.
- [ ] Diagnostics update immediately after both operations.
- [ ] Layout remains aligned after byte count changes.

## 11. SO/SI Problem Detection

Use the copied fixture and locate the `SO` byte before the explicit DBCS text.

1. Delete the `SO` byte.
2. Observe diagnostics.
3. Reinsert or revert before saving.

Expected:

- [ ] Diagnostics changes immediately without saving.
- [ ] Structural issue count appears in the summary.
- [ ] Diagnostics details show the relevant missing or unmatched SO/SI category.
- [ ] Save prompts for confirmation when structural problems exist.

### Missing SO Backtracking

Use a copied IBM-937 fixture or a small IBM-937 file containing `測試一下中文` inside `SO ... SI`.

1. Delete the leading `SO` byte only.
2. Expand diagnostics.
3. Click the `Missing SO` location.

Expected:

- [ ] `Missing SO` points to the first byte pair of the likely DBCS run, such as `5A 61` for `測`, not only to the later DBCS-only byte pair.
- [ ] Later bytes in the inferred DBCS run are highlighted as `DBCS`.
- [ ] The save confirmation counts the missing `SO` as one structural problem.
- [ ] `DBCS ambiguous` warnings remain warnings and do not independently block save.

## 12. Search

1. Open a copied IBM-937 fixture in HEX ON.
2. Press `Ctrl+F`.
3. Search Unicode text, such as `測`.
4. Search Unicode wildcard patterns, such as `*測`, `測*`, and `測*下`.
5. Search literal wildcard text with escaped patterns such as `\*` when present.
6. Switch to Hex search and search byte pairs such as `5A 61` or `0x5A 0x61`.
7. Try invalid Hex input such as `5A61`.
8. Navigate previous/next search results.
9. Press the cancel-search button.

Expected:

- [ ] `Ctrl+F` opens the search panel and does not type `F` into the active hex nibble.
- [ ] Search does not run while the user is still typing.
- [ ] Pressing the search button runs the query.
- [ ] While navigating results, the search input and mode controls are locked.
- [ ] Cancel search unlocks the input and clears the active search navigation state.
- [ ] Unicode `.` matches one preview character.
- [ ] Unicode `*` matches only within one editor line and never crosses line boundaries.
- [ ] Leading `*` extends the match to the current editor-line start.
- [ ] Trailing `*` extends the match to the current editor-line end.
- [ ] Escaped `\.` and `\*` search literal wildcard characters.
- [ ] Hex search accepts space-separated bytes with or without `0x` prefixes.
- [ ] Unseparated multi-byte Hex input is rejected with a helpful message.
- [ ] In paged mode, search applies to the current page snapshot.

## 13. Save, Reopen, Reload, Revert

### Save

1. Make a harmless edit in the copied file.
2. Click `Save` or press `Ctrl+S`.

Expected:

- [ ] Save succeeds when no structural problems exist.
- [ ] VS Code reopens the file in the default editor.
- [ ] File bytes on disk reflect the edited hex bytes.

### Reload

1. Reopen HEX ON.
2. Make an unsaved edit.
3. Click `Reload`.

Expected:

- [ ] The editor asks before discarding unsaved HEX ON edits.
- [ ] Confirming reload rereads bytes from disk.

### Revert

1. Make an unsaved edit.
2. Click `Revert`.

Expected:

- [ ] VS Code revert flow discards unsaved HEX ON edits.
- [ ] Header returns to `Ready`.

## 14. Condense Mode

1. Enable `ibmZHexEditor.condenseMode` in Settings.
2. Reopen or observe the active HEX ON editor.

Expected:

- [ ] Byte cells become narrower.
- [ ] Offsets are hidden.
- [ ] Grid edge padding is removed.
- [ ] Header keeps readable internal padding.
- [ ] Expanded diagnostics details keep readable internal padding.

Disable Condense Mode afterward and confirm the standard layout returns.

## 15. Header Collapse And Ruler

1. Open a copied fixture in HEX ON.
2. Hover the header icon buttons and confirm tooltips appear.
3. Click the `Hide header` icon button.
4. Click the compact `Show header` icon button.
4. Enable `ibmZHexEditor.showRuler` in Settings.
5. Reopen or observe the active HEX ON editor.

Expected:

- [ ] Header action controls are icon-first and show text hints on hover.
- [ ] The `Hide header` and `Show header` controls are discoverable as icon buttons.
- [ ] Header collapse hides the full title/meta/action area and increases usable grid height.
- [ ] Compact header still shows file name, encoding/status, and an expand control.
- [ ] Expanding restores the full header and Save/Reload/Revert actions.
- [ ] With `showRuler=false`, no ruler is shown.
- [ ] With `showRuler=true`, the ruler appears below diagnostics and above the byte grid.
- [ ] The ruler pattern marks fifth columns with `+` and tenth columns with digits.
- [ ] The ruler folds at the same byte count as the visual hex rows.
- [ ] The ruler aligns with byte cells in standard mode and Condense Mode.

## 16. Paged Rendering, Stress File, And Performance Logging

1. Set `ibmZHexEditor.renderMode` to `paged`.
2. Set `ibmZHexEditor.pageLineLimit` to `30`.
3. Open `.tmp/manual/SOAIPB1.acceptance.ibm937.stress-1200.cpy` as IBM-937.
4. Navigate pages with the page previous/next icon buttons.
5. Repeat briefly with `pageLineLimit` set to `50` or `100`.
6. Enable `ibmZHexEditor.performanceLogging`.
7. Reopen the stress fixture and inspect the `IBM Z HEX ON Performance` output channel.

Expected:

- [ ] The stress fixture opens without freezing VS Code / IBM Bob.
- [ ] Loading status text appears while editor data is being prepared.
- [ ] Paged mode shows page navigation controls.
- [ ] Page previous/next controls use icon buttons with localized tooltips.
- [ ] Diagnostics are calculated for the current page only.
- [ ] Unsaved edits prevent page switching until the current page is saved or discarded.
- [ ] `30`, `50`, and `100` line limits map to the expected page sizes.
- [ ] Performance logging is disabled by default.
- [ ] When enabled, timing logs are written to the `IBM Z HEX ON Performance` output channel.
- [ ] Timing logs include open, snapshot, postMessage, and webview render phases.

## 17. Extension Development Host Smoke Test

From the repository root:

1. Run `npm run compile`.
2. Open the repository in VS Code.
3. Press `F5` using the extension launch configuration.
4. Repeat sections 4 through 16 in the Extension Development Host.

Expected:

- [ ] Extension Development Host starts without debugger selection prompts.
- [ ] No unexpected errors appear in the Extension Host log.
- [ ] Behavior matches the VSIX installation test.
- [ ] If localized settings text does not update after installing a new VSIX, `Developer: Reload Window` refreshes the Settings UI strings.

## 18. Final Repository Check

- [ ] Run `git status --short`.
- [ ] Confirm no manual acceptance files are tracked.
- [ ] Confirm only intentional source, docs, or fixture changes remain.
- [ ] Remove `.tmp` if desired.

## 19. Release Documentation

1. Review [screenshots.md](screenshots.md).
2. Capture screenshots from copied fixture files.
3. Review [marketplace.md](marketplace.md).

Expected:

- [ ] Screenshot list covers encoding selection, standard editing, diagnostics, SBCS preview, Condense Mode, unsupported IBM encoding warning, and save confirmation.
- [ ] Screenshot files do not expose customer data or personal workspace details.
- [ ] Marketplace copy describes installation, supported code pages, diagnostics behavior, and known unsupported IBM code-page fallback behavior.
- [ ] Product naming, icon usage, legal notices, and generated mapping table attribution are ready for product-team review.
