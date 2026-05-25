# Screenshot Plan

Use this guide when preparing screenshots for the GitHub README or VS Code Marketplace listing.

Screenshots should come from a VSIX-installed extension or a clean Extension Development Host, using committed fixture files only.

Recommended output folder:

```text
images/screenshots/
```

## Required Shots

### 1. Encoding Picker

Suggested filename: `images/screenshots/encoding-picker.png`

Capture the `IBM Z Hex Editor: Open HEX ON` flow with the encoding picker open.

Required visible content:

- the VS Code-reported encoding item;
- the IBM EBCDIC DBCS section with at least `IBM-937`;
- the IBM EBCDIC single-byte section with at least `IBM-037` or `IBM-1047`;
- short language/encoding descriptions.

Purpose:

- shows that the user chooses the actual file-content encoding;
- explains why the extension can open IBM EBCDIC files even if VS Code displayed the file as another text encoding.

### 2. SBCS Preview

Suggested filename: `images/screenshots/sbcs-preview.png`

Capture `test/fixtures/HELLO.ibm1047.cpy` or `.tmp/manual/HELLO.acceptance.ibm1047.cpy` opened as IBM-1047.

Required visible content:

- header showing `ibm1047`;
- preview text showing `HELLO WORLD`;
- EBCDIC newline splitting `HELLO WORLD` and `ABC`;
- no diagnostics strip.

Purpose:

- demonstrates that supported SBCS EBCDIC files get code-page-aware preview;
- clarifies that DBCS diagnostics are intentionally absent for SBCS-only files.

### 3. Standard HEX ON Editor

Suggested filename: `images/screenshots/hex-on-standard.png`

Capture the main editor with:

- file header;
- character preview;
- high/low hex rows;
- visible offsets;
- diagnostics summary collapsed.

Purpose:

- shows the primary editing experience;
- makes the ISPF-style HEX ON metaphor clear.

### 4. Diagnostics Expanded

Suggested filename: `images/screenshots/diagnostics-expanded.png`

Capture IBM-937 diagnostics with:

- `SO/SI structure valid`;
- `4 DBCS pair(s)`;
- `27 warning(s)`;
- expanded category pills;
- at least one diagnostic location visible.

Purpose:

- demonstrates DBCS diagnostics and navigation;
- clarifies the difference between confirmed DBCS pairs and warnings.

### 5. Condense Mode With Ruler

Suggested filename: `images/screenshots/condense-mode.png`

Capture the same file with `ibmZHexEditor.condenseMode` and `ibmZHexEditor.showRuler` enabled.

Required visible content:

- narrower byte cells;
- hidden offsets;
- ruler row above the byte grid;
- collapsed or compact header if useful.

Purpose:

- shows how the denser layout helps fixed-format files;
- confirms header and diagnostics padding remain readable.

### 6. Unsupported IBM Encoding Warning

Suggested filename: `images/screenshots/unsupported-ibm-encoding.png`

Capture the modal shown after choosing `Enter another encoding...` and entering `cp273`.

Purpose:

- documents that manually entered unsupported IBM code pages are treated carefully;
- explains that raw byte editing can continue while code-page-aware preview falls back.

### 7. Save Confirmation

Suggested filename: `images/screenshots/save-confirmation.png`

Capture the modal shown when saving with structural IBM-937 DBCS issues.

Purpose:

- shows that the editor protects users from accidentally saving questionable SO/SI structure;
- documents the "Save Anyway" escape hatch.

## Style Notes

- Use a dark VS Code theme for consistency with the extension icon and current editor colors.
- Crop out unrelated desktop content.
- Avoid using production or customer data.
- Prefer the committed fixture or a synthetic file with clearly safe sample content.
- Keep screenshots in PNG format.
- Capture at a width that leaves the byte grid, header, diagnostics, and ruler readable without horizontal compression.
- Do not capture unsaved personal workspace paths unless the path is intentionally part of the test setup.

## Manual Fixture Setup

Use copied files rather than editing committed fixtures:

```powershell
New-Item -ItemType Directory -Force .tmp\manual | Out-Null
Copy-Item test\fixtures\SOAIPB1.ibm937.cpy .tmp\manual\SOAIPB1.screenshot.ibm937.cpy -Force
Copy-Item test\fixtures\HELLO.ibm1047.cpy .tmp\manual\HELLO.screenshot.ibm1047.cpy -Force
```

## README Use

After screenshots are captured and reviewed, add the most important two or three images to the README:

1. `encoding-picker.png`
2. `diagnostics-expanded.png`
3. `condense-mode.png` or `sbcs-preview.png`

Avoid adding every screenshot to the README. Keep the full screenshot set for Marketplace assets and release notes.

## Automated Webview Capture

The webview-only screenshots can be regenerated with:

```powershell
npm run capture:screenshots
```

This script starts a local Vite server, renders the editor with demo snapshots, and captures:

- `images/screenshots/hex-on-standard.png`
- `images/screenshots/diagnostics-expanded.png`
- `images/screenshots/sbcs-preview.png`
- `images/screenshots/condense-mode.png`

The following VS Code chrome or modal screenshots still need manual capture from an Extension Development Host or VSIX-installed extension:

- `images/screenshots/encoding-picker.png`
- `images/screenshots/unsupported-ibm-encoding.png`
- `images/screenshots/save-confirmation.png`
