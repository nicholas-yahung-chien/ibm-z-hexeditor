# Screenshot Plan

Use this guide when preparing screenshots for the GitHub README or VS Code Marketplace listing.

Screenshots should come from a VSIX-installed extension or a clean Extension Development Host, using the IBM-937 fixture copied from `test/fixtures/SOAIPB1.ibm937.cpy`.

Recommended output folder:

```text
images/screenshots/
```

## Required Shots

### 1. Encoding Picker

Suggested filename: `images/screenshots/encoding-picker.png`

Capture the `IBM Z Hex Editor: Open HEX ON` flow with the encoding picker open and `IBM-937` visible.

Purpose:

- shows that the user chooses the actual file-content encoding;
- explains why the extension can open IBM-937 files even if VS Code displayed the file as another text encoding.

### 2. Standard HEX ON Editor

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

### 3. Diagnostics Expanded

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

### 4. Condense Mode

Suggested filename: `images/screenshots/condense-mode.png`

Capture the same file with `ibmZHexEditor.condenseMode` enabled.

Purpose:

- shows how the denser layout helps fixed-format files;
- confirms header and diagnostics padding remain readable.

### 5. Save Confirmation

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
