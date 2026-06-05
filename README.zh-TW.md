# IBM Z HEX ON Editor

[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Deutsch](README.de.md)

![IBM Z HEX ON Editor icon](images/icon.png)

IBM Z HEX ON Editor 為 VS Code 提供 ISPF 風格的位元組編輯器。你可以開啟本機檔案或支援的 Zowe 資源，選擇位元組實際使用的編碼，直接編輯高位與低位 hex nibble，並將更新後的原始位元組寫回檔案。

目前的 MVP 主要聚焦在 IBM EBCDIC 與 UTF-8 工作流程。IBM-037、IBM-500、IBM-1047、IBM-1140 提供 SBCS 預覽支援。IBM-930、IBM-933、IBM-935、IBM-937、IBM-939、IBM-1364、IBM-1371、IBM-1388、IBM-1390、IBM-1399 提供 DBCS 的 SO/SI 結構診斷，讓你能直接在 VS Code 中檢查、修復與驗證 shift-byte 問題。

對於從 Zowe Explorer 樹狀檢視開啟、且屬於固定長度的 Zowe data set member，HEX ON 現在會優先使用 direct binary save，再視需要退回 text-based upload fallback。這可讓已驗證的 raw-byte 編輯盡量留在 binary 路徑上，並避免 Zowe Explorer 常見的誤報「資料遺失」警告。

## 你可以做什麼

- 以 HEX ON custom editor 開啟本機檔案、Zowe data set 或 Zowe USS 檔案。
- 辨識目前編輯器使用的是 local raw bytes、Zowe host raw bytes 或 Zowe text-backed bytes。
- 對支援的固定長度 Zowe data set member 使用較安全的 direct-binary save。
- 以可編輯的 high/low hex-nibble rows 檢視 raw file bytes。
- 用選定編碼顯示唯讀的字元預覽。
- 透過修改 nibble、插入 `00`、刪除 byte 來編輯內容。
- 預覽支援的 IBM EBCDIC SBCS 與 DBCS 位元組文字。
- 檢查 IBM EBCDIC DBCS 的 SO/SI 結構與 DBCS ambiguity warnings。
- 從 diagnostics 直接跳到對應 byte 位置。
- 將編輯後的位元組寫回檔案，並在完成後回到 VS Code 預設編輯器。
- 啟用 Condense Mode，在每列顯示更多 bytes。
- 收合 header，並視需要在 byte grid 上方顯示 column ruler。

## 螢幕截圖

目前 webview 體驗的螢幕截圖如下。完整的截圖清單、檔名與手動 fixture 準備方式記錄在 [docs/screenshots.md](docs/screenshots.md)。Marketplace 用的文案草稿記錄在 [docs/marketplace.md](docs/marketplace.md)。

![Standard HEX ON editor](images/screenshots/hex-on-standard.png)

![Expanded DBCS diagnostics](images/screenshots/diagnostics-expanded.png)

![Condense Mode with column ruler](images/screenshots/condense-mode.png)

## 安裝

### 從 VSIX 安裝

先建立套件：

```sh
npm install
npm run package:vsix
```

在 VS Code 安裝 `dist/ibm-z-hex-on-editor.vsix`：

1. 開啟 Extensions 檢視。
2. 執行 `Extensions: Install from VSIX...`。
3. 選取 `dist/ibm-z-hex-on-editor.vsix`。
4. 若系統提示，重新載入 VS Code。

如果安裝或更新 VSIX 後，本地化設定文字沒有立即更新，請執行 `Developer: Reload Window`，或重新啟動 VS Code / IBM Bob。

若要以乾淨的 VS Code profile 做可重複驗證，請參考 [docs/acceptance-checklist.md](docs/acceptance-checklist.md)。

### 從原始碼執行

```sh
npm install
npm run compile
```

在 VS Code 開啟此 repository，按下 `F5` 以啟動 Extension Development Host。

## 基本使用方式

1. 在 VS Code 中開啟本機檔案，或在 Zowe Explorer 中選取支援的 data set/member 或 USS 檔案。
2. 從 Command Palette、editor title menu、editor context menu 或 Zowe Explorer tree context menu 執行 `IBM Z Hex Editor: Open HEX ON`。
3. 如果目前檔案有未儲存變更，請先儲存。
4. 選擇磁碟上位元組實際使用的 file-content encoding。
5. 在 HEX ON 檢視中編輯 bytes。
6. 按下 `Ctrl+S` 或點選 `Save`。

若檔案位元組使用支援的 IBM EBCDIC SBCS 或 DBCS code page，請選擇相對應的編碼，即使 VS Code 先前是用其他文字編碼顯示該檔案。

如果手動輸入尚未支援的 IBM-style code page id，extension 會在開啟前顯示警告。raw byte editing 仍可繼續，但 preview、row splitting 與 diagnostics 會退回 generic fallback behavior。

在 HEX ON editor 中按 `Ctrl+F` 可開啟搜尋。輸入查詢後按下搜尋按鈕，會在目前 snapshot 中搜尋；當你在結果間移動時，輸入框會被鎖定，直到按下取消搜尋為止。Unicode 搜尋支援 `.` 與限制在同一 editor line 內的 `*` 萬用字元，也支援 `\.` 與 `\*` 搜尋字面值。前置 `*` 會把比對延伸到目前 editor line 的開頭，結尾 `*` 會延伸到目前 editor line 的結尾。Hex 搜尋接受以空白分隔的 bytes，例如 `A6 4F` 或 `0xA6 0x4F`。

## 設定

- `ibmZHexEditor.maxFileSizeKb`: 可在 HEX ON editor 中開啟的最大資源大小，單位為 KB。
- `ibmZHexEditor.condenseMode`: 顯示更緊湊的 grid，包含較窄的 byte cells、隱藏 offsets，以及移除 grid edge padding。
- `ibmZHexEditor.showRuler`: 在 byte grid 上方顯示 column ruler。
- `ibmZHexEditor.renderMode`: 選擇顯示整個檔案，或一次只顯示一頁。
- `ibmZHexEditor.pageLineLimit`: paged mode 每頁最多顯示的 logical lines。可選 `30`、`50`、`100`；若檔案沒有明確換行，則分別對應 `3000`、`5000`、`10000` bytes。
- `ibmZHexEditor.performanceLogging`: 將 editor timing logs 寫入 `IBM Z HEX ON Performance` output channel，預設停用。
- `ibmZHexEditor.dbcsAmbiguousExclusionsEnabled`: 對 `DBCS_AMBIGUOUS` warnings 啟用 custom byte-pair exclusions。
- `ibmZHexEditor.dbcsAmbiguousExclusions`: byte-pair rules，例如 `{ "bytes": "40 40", "label": "EBCDIC spaces" }`。當首次啟用 custom exclusions 時，extension 會把預設規則寫入 user settings JSON 供你編輯。

## 文件

- [User guide](docs/user-guide.md)
- [IBM DBCS diagnostics rules](docs/diagnostics.md)
- [Code page architecture](docs/code-page-architecture.md)
- [Acceptance checklist](docs/acceptance-checklist.md)
- [Icon design notes](docs/icon-design.md)
- [Localization plan](docs/i18n.md)
- [Marketplace listing draft](docs/marketplace.md)
- [Release checklist](docs/release-checklist.md)
- [Release notes 0.2.0](docs/release-notes-0.2.0.md)
- [Release notes 0.1.0](docs/release-notes-0.1.0.md)
- [Screenshot plan](docs/screenshots.md)
- [Change log](CHANGELOG.md)
- [Roadmap](docs/roadmap.md)

## 目前限制

- 支援本機檔案與 Zowe Explorer `zowe-ds` / `zowe-uss` 資源。
- 若要最可靠的 Zowe host raw-byte editing，請從 Zowe Explorer 樹狀檢視啟動 HEX ON。對支援的固定長度 `zowe-ds:` member，這條路徑也會優先走 direct binary save；若是從已開啟的 Zowe 文字編輯器進入，仍可能沿用文字傳輸編碼與 fallback save 行為。
- 如果 Zowe 資源已在一般文字編輯器中開啟，再從該編輯器啟動 HEX ON，header 會顯示 `Zowe text-backed bytes`。這對文字導向修改可能有幫助，但不能取代用於修復 SO/SI 或損壞 DBCS byte sequences 的 raw-byte 路徑。
- IBM-037、IBM-500、IBM-1047、IBM-1140 提供 SBCS preview，但沒有 DBCS diagnostics。
- IBM-930、IBM-933、IBM-935、IBM-937、IBM-939、IBM-1364、IBM-1371、IBM-1388、IBM-1390、IBM-1399 提供 SO/SI DBCS diagnostics。
- 其他 IBM EBCDIC SBCS 或 DBCS code pages 可在 fixtures 與 tests 就緒後，透過 generated-table workflow 擴充。
- 目前提供繁體中文、簡體中文、日文、韓文與德文的第一輪本地化，但在外部正式發布前，仍建議做產品級語系審校。

## 開發驗證

```sh
npm run type-check
npm test
npm run package:vsix
```
