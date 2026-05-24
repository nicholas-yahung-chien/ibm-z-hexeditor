# Acceptance Checklist

Use this checklist before sharing a VSIX build or cutting an MVP release candidate.

## 1. Build And Package

- [ ] Run `npm install` after pulling new dependency changes.
- [ ] Run `npm run type-check`.
- [ ] Run `npm test`.
- [ ] Run `npm run package:vsix`.
- [ ] Confirm `dist/ibm-z-hex-on-editor.vsix` exists.
- [ ] Confirm the package command finishes without warnings that require action.

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

## 3. Prepare Manual Test File

Do not edit the committed fixture directly during manual acceptance. Copy it first:

```powershell
New-Item -ItemType Directory -Force .tmp\manual | Out-Null
Copy-Item test\fixtures\SOAIPB1.ibm937.cpy .tmp\manual\SOAIPB1.acceptance.ibm937.cpy -Force
```

Expected:

- [ ] `.tmp/manual/SOAIPB1.acceptance.ibm937.cpy` exists.
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

## 5. IBM-937 Diagnostics Baseline

With the copied fixture opened as IBM-937:

- [ ] Diagnostics summary shows `SO/SI structure valid`.
- [ ] Diagnostics summary shows `4 DBCS pair(s)`.
- [ ] Diagnostics summary shows `27 warning(s)`.
- [ ] Expanding diagnostics shows `SO 1`, `SI 1`, `DBCS 4`, and `DBCS ambiguous 27`.
- [ ] `DBCS ambiguous` locations do not include repeated `5C 5C` COBOL comment asterisks.

## 6. Diagnostics Navigation

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

## 7. Nibble Editing

1. Move to a safe byte in the copied file.
2. Type a hex digit `0` to `9` or `A` to `F`.
3. Move with arrow keys.

Expected:

- [ ] Only the active nibble changes.
- [ ] Header status changes to `Modified`.
- [ ] Byte count does not change.
- [ ] Preview and diagnostics update immediately.

## 8. Insert And Delete

1. Press `Insert`.
2. Confirm byte `00` is inserted at the active position.
3. Press `Delete` or `Backspace`.

Expected:

- [ ] Byte count increases by 1 after insert.
- [ ] Byte count returns after delete.
- [ ] Diagnostics update immediately after both operations.
- [ ] Layout remains aligned after byte count changes.

## 9. SO/SI Problem Detection

Use the copied fixture and locate the `SO` byte before the explicit DBCS text.

1. Delete the `SO` byte.
2. Observe diagnostics.
3. Reinsert or revert before saving.

Expected:

- [ ] Diagnostics changes immediately without saving.
- [ ] Structural issue count appears in the summary.
- [ ] Diagnostics details show the relevant missing or unmatched SO/SI category.
- [ ] Save prompts for confirmation when structural problems exist.

## 10. Save, Reopen, Reload, Revert

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

## 11. Condense Mode

1. Enable `ibmZHexEditor.condenseMode` in Settings.
2. Reopen or observe the active HEX ON editor.

Expected:

- [ ] Byte cells become narrower.
- [ ] Offsets are hidden.
- [ ] Grid edge padding is removed.
- [ ] Header keeps readable internal padding.
- [ ] Expanded diagnostics details keep readable internal padding.

Disable Condense Mode afterward and confirm the standard layout returns.

## 12. Extension Development Host Smoke Test

From the repository root:

1. Run `npm run compile`.
2. Open the repository in VS Code.
3. Press `F5` using the extension launch configuration.
4. Repeat sections 4 through 11 in the Extension Development Host.

Expected:

- [ ] Extension Development Host starts without debugger selection prompts.
- [ ] No unexpected errors appear in the Extension Host log.
- [ ] Behavior matches the VSIX installation test.

## 13. Final Repository Check

- [ ] Run `git status --short`.
- [ ] Confirm no manual acceptance files are tracked.
- [ ] Confirm only intentional source, docs, or fixture changes remain.
- [ ] Remove `.tmp` if desired.
