# IBM Z HEX ON Editor

[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Deutsch](README.de.md)

![IBM Z HEX ON Editor icon](images/icon.png)

IBM Z HEX ON Editor は、VS Code に ISPF スタイルのバイトエディターを追加します。ローカルファイルまたは対応する Zowe リソースを開き、バイトが実際に使用しているエンコーディングを選択し、高位と低位の hex nibble を直接編集して、更新後の raw bytes をファイルへ保存できます。

現在の MVP は、IBM EBCDIC と UTF-8 のワークフローに重点を置いています。IBM-037、IBM-500、IBM-1047、IBM-1140 では SBCS プレビューを提供します。IBM-930、IBM-933、IBM-935、IBM-937、IBM-939、IBM-1364、IBM-1371、IBM-1388、IBM-1390、IBM-1399 では DBCS データ向けの SO/SI 構造診断を提供し、shift-byte の問題を VS Code 上で確認、修復、検証できます。

Zowe Explorer のツリーから開いた固定長の Zowe data set member については、HEX ON はまず direct binary save を試し、必要な場合のみ text-based upload fallback に戻ります。これにより、検証済みの raw-byte 編集をできるだけ binary パス上に保ち、Zowe Explorer の誤検知による「data loss」警告を避けやすくなります。

## できること

- ローカルファイル、Zowe data set、Zowe USS ファイルを HEX ON custom editor で開く。
- 現在のエディターが local raw bytes、Zowe host raw bytes、Zowe text-backed bytes のどれを使っているか確認する。
- 対応する固定長 Zowe data set member に対して、より安全な direct-binary save を使う。
- raw file bytes を編集可能な high/low hex-nibble rows として表示する。
- 選択したエンコーディングで読み取った読み取り専用の文字プレビューを表示する。
- nibble の置換、`00` の挿入、byte の削除で編集する。
- 対応する IBM EBCDIC SBCS / DBCS の文字プレビューを確認する。
- IBM EBCDIC DBCS の SO/SI 構造と DBCS ambiguity warnings を確認する。
- diagnostics から該当 byte 位置へジャンプする。
- 編集後の bytes を保存し、完了後に VS Code の既定エディターへ戻る。
- Condense Mode を有効にして、1 行あたりの bytes 表示数を増やす。
- header を折りたたみ、必要に応じて byte grid 上部に column ruler を表示する。

## スクリーンショット

現在の webview のスクリーンショットを以下に示します。完全なスクリーンショット一覧、ファイル名、手動 fixture 準備手順は [docs/screenshots.md](docs/screenshots.md) にあります。Marketplace 向けの文案は [docs/marketplace.md](docs/marketplace.md) にあります。

![Standard HEX ON editor](images/screenshots/hex-on-standard.png)

![Expanded DBCS diagnostics](images/screenshots/diagnostics-expanded.png)

![Condense Mode with column ruler](images/screenshots/condense-mode.png)

## インストール

### VSIX からインストール

まずパッケージを作成します。

```sh
npm install
npm run package:vsix
```

VS Code で `dist/ibm-z-hex-on-editor.vsix` をインストールします。

1. Extensions ビューを開く。
2. `Extensions: Install from VSIX...` を実行する。
3. `dist/ibm-z-hex-on-editor.vsix` を選択する。
4. 求められたら VS Code を再読み込みする。

VSIX のインストールまたは更新後にローカライズされた設定文字列がすぐ反映されない場合は、`Developer: Reload Window` を実行するか、VS Code / IBM Bob を再起動してください。

クリーンな VS Code profile で再現可能な検証を行う場合は、[docs/acceptance-checklist.md](docs/acceptance-checklist.md) を参照してください。

### ソースから実行

```sh
npm install
npm run compile
```

この repository を VS Code で開き、`F5` を押して Extension Development Host を起動します。

## 基本的な使い方

1. VS Code でローカルファイルを開くか、Zowe Explorer で対応する data set/member または USS ファイルを選択する。
2. Command Palette、editor title menu、editor context menu、または Zowe Explorer tree context menu から `IBM Z Hex Editor: Open HEX ON` を実行する。
3. 現在のファイルに未保存の変更がある場合は、先に保存する。
4. ディスク上の bytes が実際に使用している file-content encoding を選択する。
5. HEX ON ビューで bytes を編集する。
6. `Ctrl+S` を押すか、`Save` をクリックする。

ファイルの bytes が対応する IBM EBCDIC SBCS または DBCS code page を使用している場合は、VS Code が以前に別の text encoding で表示していたとしても、その code page を選択してください。

未対応の IBM-style code page id を手動で入力した場合、extension は開く前に警告を表示します。raw byte editing は継続できますが、preview、row splitting、diagnostics は generic fallback behavior を使用します。

HEX ON editor で `Ctrl+F` を押すと検索パネルが開きます。クエリを入力して検索ボタンを押すと、現在の snapshot を検索します。結果を移動している間は入力がロックされ、検索キャンセルを押すまで編集できません。Unicode 検索では `.` と、同じ editor line 内に限定された `*` ワイルドカードが使え、`\.` と `\*` で文字そのものを検索できます。先頭の `*` は現在の editor line の先頭まで、末尾の `*` は現在の editor line の末尾まで一致範囲を広げます。Hex 検索では `A6 4F` や `0xA6 0x4F` のように空白区切りの bytes を受け付けます。

## 設定

- `ibmZHexEditor.maxFileSizeKb`: HEX ON editor で開ける最大リソースサイズ（KB）。
- `ibmZHexEditor.condenseMode`: 狭い byte cells、非表示の offsets、grid edge padding の削除により、より密度の高い grid を表示する。
- `ibmZHexEditor.showRuler`: byte grid の上に column ruler を表示する。
- `ibmZHexEditor.renderMode`: ファイル全体を表示するか、1 ページずつ表示するかを選ぶ。
- `ibmZHexEditor.pageLineLimit`: paged mode で 1 ページに表示する最大 logical lines。`30`、`50`、`100` を選択でき、明示的な改行がない場合はそれぞれ `3000`、`5000`、`10000` bytes に相当する。
- `ibmZHexEditor.performanceLogging`: editor timing logs を `IBM Z HEX ON Performance` output channel に書き込む。既定では無効。
- `ibmZHexEditor.dbcsAmbiguousExclusionsEnabled`: `DBCS_AMBIGUOUS` warnings 向けに custom byte-pair exclusions を使う。
- `ibmZHexEditor.dbcsAmbiguousExclusions`: `{ "bytes": "40 40", "label": "EBCDIC spaces" }` のような byte-pair rules。custom exclusions を初めて有効にすると、extension が既定ルールを user settings JSON に書き出します。

## ドキュメント

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

## 現在の制限

- ローカルファイルと Zowe Explorer `zowe-ds` / `zowe-uss` リソースをサポートする。
- 最も確実な Zowe host raw-byte editing を行うには、Zowe Explorer のツリーから HEX ON を起動してください。対応する固定長 `zowe-ds:` member ではこの経路で direct binary save が優先されますが、すでに開いている Zowe のテキストエディターから入ると、text-transfer encoding と fallback save behavior を引き継ぐ場合があります。
- Zowe リソースが通常のテキストエディターですでに開かれている状態から HEX ON を起動すると、header には `Zowe text-backed bytes` と表示されます。これはテキスト指向の編集には便利ですが、SO/SI や壊れた DBCS byte sequences の修復用 raw-byte パスの代わりにはなりません。
- IBM-037、IBM-500、IBM-1047、IBM-1140 は SBCS preview を提供するが、DBCS diagnostics はない。
- IBM-930、IBM-933、IBM-935、IBM-937、IBM-939、IBM-1364、IBM-1371、IBM-1388、IBM-1390、IBM-1399 は SO/SI DBCS diagnostics を提供する。
- その他の IBM EBCDIC SBCS / DBCS code pages は、fixtures と tests が揃い次第、generated-table workflow で追加できる。
- 現在は繁体字中国語、簡体字中国語、日本語、韓国語、ドイツ語の first-pass localization を提供しているが、外部公開前には製品レベルの言語レビューを推奨する。

## 開発検証

```sh
npm run type-check
npm test
npm run package:vsix
```
