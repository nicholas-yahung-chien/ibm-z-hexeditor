# IBM Z HEX ON Editor

[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Deutsch](README.de.md)

![IBM Z HEX ON Editor icon](images/icon.png)

IBM Z HEX ON Editor は、VS Code に ISPF スタイルのバイト エディターを追加します。ローカル ファイルを開き、ディスク上の実際の内容エンコーディングを選択し、high/low hex nibbles を直接編集して、更新した raw bytes をファイルへ保存できます。

現在の MVP は IBM EBCDIC と UTF-8 のワークフローに重点を置いています。IBM-037、IBM-500、IBM-1047、IBM-1140 ファイルでは SBCS プレビューを利用できます。IBM-930、IBM-933、IBM-935、IBM-937、IBM-939、IBM-1364、IBM-1371、IBM-1388、IBM-1390、IBM-1399 ファイルでは、DBCS データの SO/SI 構造診断を利用でき、VS Code 内で shift-byte の問題を確認、修復、検証できます。

## できること

- ローカル ファイルを HEX ON custom editor で開く。
- raw file bytes を編集可能な high/low hex-nibble 行として表示する。
- 選択したエンコーディングでデコードした読み取り専用文字プレビューを見る。
- nibble の置換、`00` の挿入、byte の削除で内容を編集する。
- サポート対象の IBM EBCDIC SBCS/DBCS bytes を文字としてプレビューする。
- IBM EBCDIC DBCS SO/SI 構造と DBCS ambiguous 警告を確認する。
- diagnostics から正確な byte 位置へジャンプする。
- 編集した bytes をディスクへ保存し、VS Code の既定エディターに戻る。
- Condense Mode を有効にして 1 行により多くの bytes を表示する。
- header を折りたたみ、必要に応じて byte grid の上に column ruler を表示する。

## スクリーンショット

現在の webview 体験のスクリーンショットを以下に示します。完全な一覧、ファイル名、手動 fixture 設定は [docs/screenshots.md](docs/screenshots.md) に記録されています。Marketplace 用の説明文案は [docs/marketplace.md](docs/marketplace.md) にあります。

![Standard HEX ON editor](images/screenshots/hex-on-standard.png)

![Expanded DBCS diagnostics](images/screenshots/diagnostics-expanded.png)

![Condense Mode with column ruler](images/screenshots/condense-mode.png)

## インストール

### VSIX からインストール

パッケージを作成します。

```sh
npm install
npm run package:vsix
```

VS Code で `dist/ibm-z-hex-on-editor.vsix` をインストールします。

1. Extensions ビューを開きます。
2. `Extensions: Install from VSIX...` を実行します。
3. `dist/ibm-z-hex-on-editor.vsix` を選択します。
4. 求められた場合は VS Code を再読み込みします。

VSIX のインストールまたは更新後に設定ページのローカライズ文字列がすぐに更新されない場合は、`Developer: Reload Window` を実行するか、VS Code / IBM Bob を再起動してください。

クリーンな VS Code profile で再現可能な検証を行う場合は、[docs/acceptance-checklist.md](docs/acceptance-checklist.md) を参照してください。

### ソースから実行

```sh
npm install
npm run compile
```

この repository を VS Code で開き、`F5` を押して Extension Development Host を起動します。

## 基本的な使い方

1. VS Code でローカル ファイルを開きます。
2. Command Palette、editor title menu、または editor context menu から `IBM Z Hex Editor: Open HEX ON` を実行します。
3. 現在のファイルに未保存の変更がある場合は先に保存します。
4. ディスク上の実際の file-content encoding を選択します。
5. HEX ON ビューで bytes を編集します。
6. `Ctrl+S` を押すか `Save` をクリックします。

ファイル bytes がサポート対象の IBM EBCDIC SBCS または DBCS code page を使用している場合は、VS Code が以前に別の text encoding で表示していたとしても、その実際の code page を選択してください。

未対応の IBM-style code page id を手入力すると、extension は開く前に警告を表示します。raw byte editing は引き続き利用できますが、preview、row splitting、diagnostics は generic fallback behavior を使用します。

HEX ON editor 内で `Ctrl+F` を押すと検索を開けます。条件を入力して検索ボタンを押すと、現在の snapshot を検索します。結果の移動中は入力欄がロックされ、検索キャンセルを押すまで編集できません。Unicode 検索では `.` と、editor line をまたがない `*` ワイルドカードを使用でき、`\.` と `\*` でリテラル記号を検索できます。先頭の `*` は現在の editor line の先頭まで、末尾の `*` は現在の editor line の末尾まで一致範囲を広げます。Hex 検索では `A6 4F` や `0xA6 0x4F` のように空白で区切った bytes を指定します。

## 設定

- `ibmZHexEditor.maxFileSizeKb`: HEX ON editor で開けるローカル ファイルの最大サイズ。単位は KB。
- `ibmZHexEditor.condenseMode`: より密な grid を表示し、狭い byte cell、非表示の offset、grid 端の padding なしで表示します。
- `ibmZHexEditor.showRuler`: byte grid の上に column ruler を表示します。
- `ibmZHexEditor.renderMode`: ファイル全体を表示するか、1 ページずつ表示するかを選択します。
- `ibmZHexEditor.pageLineLimit`: ページ表示モードで 1 ページに表示する論理行数の上限。`30`、`50`、`100` を選択できます。明示的な改行がないファイルでは、それぞれ 1 ページ `3000`、`5000`、`10000` bytes になります。
- `ibmZHexEditor.performanceLogging`: editor timing logs を `IBM Z HEX ON Performance` output channel に書き込みます。既定では無効です。
- `ibmZHexEditor.dbcsAmbiguousExclusionsEnabled`: `DBCS_AMBIGUOUS` warnings に custom byte-pair exclusions を使用します。
- `ibmZHexEditor.dbcsAmbiguousExclusions`: `{ "bytes": "40 40", "label": "EBCDIC spaces" }` のような byte-pair rules。custom exclusions を初めて有効にすると、extension は既定の rules を user settings JSON に書き込み、編集できるようにします。

## ドキュメント

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

## 現在の制限

- ローカル ファイルのみ対応。
- IBM-037、IBM-500、IBM-1047、IBM-1140 は SBCS preview に対応していますが、DBCS diagnostics はありません。
- IBM-930、IBM-933、IBM-935、IBM-937、IBM-939、IBM-1364、IBM-1371、IBM-1388、IBM-1390、IBM-1399 は SO/SI DBCS diagnostics に対応しています。
- 追加の IBM EBCDIC SBCS または DBCS code pages は、fixtures と tests が用意できた後、generated-table workflow で追加できます。
- 繁体字中国語、簡体字中国語、日本語、韓国語、ドイツ語の first-pass localization を提供しています。外部公開前には製品ローカリゼーション レビューを推奨します。

## 開発時の検証

```sh
npm run type-check
npm test
npm run package:vsix
```
