# Release Notes 0.2.0

## Summary

Version `0.2.0` marks a larger delivery milestone around safer Zowe save behavior for validated fixed-length data set members. HEX ON now prefers its direct binary write path before falling back to Zowe Explorer's standard save flow, which reduces false-positive "data loss" warnings during normal raw-byte editing.

## Highlights

- Supported fixed-length `zowe-ds:` members opened from the Zowe Explorer tree now save through HEX ON's primary direct-binary path first.
- Existing fallback behavior remains in place for unsupported resources or cases where the direct-binary path is unavailable.
- Release documentation and Marketplace copy now describe the current Zowe launch and save guidance more accurately.

## Recommended Validation

- Open a fixed-length `zowe-ds:` member from the Zowe Explorer tree.
- Make a small byte edit and save.
- Confirm the save succeeds without the generic Zowe Explorer "data loss" warning.
- Reopen the member and verify the edited bytes persist.

## Known Limits

- Resources opened from an already open Zowe text editor can still follow Zowe Explorer's text-transfer path.
- Unsupported `zowe-ds:` members and `zowe-uss:` saves still rely on fallback behavior.
- This release does not change Zowe Explorer itself; it narrows when HEX ON needs to depend on Zowe Explorer's standard save pipeline.
