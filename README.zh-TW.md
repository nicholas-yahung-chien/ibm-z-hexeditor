# IBM Z HEX ON Editor

[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Deutsch](README.de.md)

![IBM Z HEX ON Editor icon](images/icon.png)

IBM Z HEX ON Editor 會在 VS Code 中加入 ISPF 風格的位元組編輯器。開啟本機檔案、選擇磁碟上實際使用的內容編碼、直接編輯 high/low hex nibbles，然後把更新後的原始位元組寫回檔案。

目前 MVP 聚焦於 IBM EBCDIC 與 UTF-8 工作流程。IBM-037、IBM-500、IBM-1047、IBM-1140 檔案提供 SBCS 預覽支援。IBM-930、IBM-933、IBM-935、IBM-937、IBM-939、IBM-1364、IBM-1371、IBM-1388、IBM-1390、IBM-1399 檔案提供 DBCS 資料的 SO/SI 結構診斷，協助你在 VS Code 內檢查、修復並驗證 shift-byte 問題。

## 可以做什麼

- 以 HEX ON custom editor 開啟本機檔案。
- 以可編輯的 high/low hex-nibble 列檢視原始檔案位元組。
- 依照你選擇的編碼顯示唯讀字符預覽。
- 透過取代 nibble、插入 `00`、刪除 byte 來編輯內容。
- 將支援的 IBM EBCDIC SBCS 與 DBCS 位元組預覽為文字。
- 檢查 IBM EBCDIC DBCS SO/SI 結構與 DBCS ambiguous 警告。
- 從 diagnostics 跳轉到精確的 byte 位置。
- 將編輯後的位元組存回磁碟，然後回到 VS Code 預設編輯器。
- 啟用 Condense Mode，讓每列顯示更多 bytes。
- 收合 header，並可選擇在 byte grid 上方顯示 column ruler。

## 截圖

目前 webview 體驗的截圖如下。完整截圖清單、檔名與手動 fixture 設定紀錄於 [docs/screenshots.md](docs/screenshots.md)。Marketplace 文案草稿紀錄於 [docs/marketplace.md](docs/marketplace.md)。

![Standard HEX ON editor](images/screenshots/hex-on-standard.png)

![Expanded DBCS diagnostics](images/screenshots/diagnostics-expanded.png)

![Condense Mode with column ruler](images/screenshots/condense-mode.png)

## 安裝

### 從 VSIX 安裝

建立套件：

```sh
npm install
npm run package:vsix
```

在 VS Code 中安裝 `dist/ibm-z-hex-on-editor.vsix`：

1. 開啟 Extensions 檢視。
2. 執行 `Extensions: Install from VSIX...`。
3. 選取 `dist/ibm-z-hex-on-editor.vsix`。
4. 如果 VS Code 提示，請重新載入。

若要使用乾淨 VS Code profile 進行可重複驗證，請參考 [docs/acceptance-checklist.md](docs/acceptance-checklist.md)。

### 從原始碼執行

```sh
npm install
npm run compile
```

用 VS Code 開啟此 repository，按 `F5` 啟動 Extension Development Host。

## 基本使用

1. 在 VS Code 中開啟本機檔案。
2. 從 Command Palette、editor title menu 或 editor context menu 執行 `IBM Z Hex Editor: Open HEX ON`。
3. 如果目前檔案有未儲存變更，請先儲存。
4. 選擇磁碟上實際檔案內容使用的編碼。
5. 在 HEX ON 檢視中編輯 bytes。
6. 按 `Ctrl+S` 或點選 `Save`。

當檔案 bytes 使用支援的 IBM EBCDIC SBCS 或 DBCS code page 時，請選擇該編碼，即使 VS Code 先前是以其他文字編碼顯示檔案也一樣。

如果手動輸入尚未支援的 IBM-style code page id，extension 會先顯示警告。原始 byte 編輯仍可使用，但 preview、row splitting 與 diagnostics 會改用通用 fallback 行為。

## 設定

- `ibmZHexEditor.maxFileSizeKb`：HEX ON editor 可開啟的本機檔案大小上限，單位為 KB。
- `ibmZHexEditor.condenseMode`：顯示更緊湊的 grid，使用較窄的 byte cell、隱藏 offset，並移除 grid 邊緣 padding。
- `ibmZHexEditor.showRuler`：在 byte grid 上方顯示 column ruler。
- `ibmZHexEditor.dbcsAmbiguousExclusionsEnabled`：對 `DBCS_AMBIGUOUS` warnings 使用自訂 byte-pair exclusions。
- `ibmZHexEditor.dbcsAmbiguousExclusions`：byte-pair rules，例如 `{ "bytes": "40 40", "label": "EBCDIC spaces" }`。第一次啟用自訂 exclusions 時，extension 會將預設 rules 寫入 user settings JSON 以便編輯。

## 文件

- [User guide](docs/user-guide.md)
- [IBM DBCS diagnostics rules](docs/diagnostics.md)
- [Code page architecture](docs/code-page-architecture.md)
- [Acceptance checklist](docs/acceptance-checklist.md)
- [Icon design notes](docs/icon-design.md)
- [Localization plan](docs/i18n.md)
- [Marketplace listing draft](docs/marketplace.md)
- [Release checklist](docs/release-checklist.md)
- [Release notes 0.1.0](docs/release-notes-0.1.0.md)
- [Screenshot plan](docs/screenshots.md)
- [Change log](CHANGELOG.md)
- [Roadmap](docs/roadmap.md)

## 目前限制

- 僅支援本機檔案。
- IBM-037、IBM-500、IBM-1047、IBM-1140 有 SBCS preview 支援，但沒有 DBCS diagnostics。
- IBM-930、IBM-933、IBM-935、IBM-937、IBM-939、IBM-1364、IBM-1371、IBM-1388、IBM-1390、IBM-1399 有 SO/SI DBCS diagnostics。
- 其他 IBM EBCDIC SBCS 或 DBCS code pages 可以在取得 fixtures 與 tests 後，透過 generated-table workflow 加入。
- 已提供繁體中文、簡體中文、日文、韓文、德文的第一版多語系內容；對外發佈前仍建議進行產品語系審閱。

## 開發驗證

```sh
npm run type-check
npm test
npm run package:vsix
```
