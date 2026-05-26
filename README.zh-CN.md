# IBM Z HEX ON Editor

[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Deutsch](README.de.md)

![IBM Z HEX ON Editor icon](images/icon.png)

IBM Z HEX ON Editor 为 VS Code 增加 ISPF 风格的字节编辑器。打开本地文件、选择磁盘上实际使用的内容编码、直接编辑 high/low hex nibbles，并将更新后的原始字节写回文件。

当前 MVP 聚焦于 IBM EBCDIC 与 UTF-8 工作流。IBM-037、IBM-500、IBM-1047、IBM-1140 文件提供 SBCS 预览支持。IBM-930、IBM-933、IBM-935、IBM-937、IBM-939、IBM-1364、IBM-1371、IBM-1388、IBM-1390、IBM-1399 文件提供 DBCS 数据的 SO/SI 结构诊断，帮助你在 VS Code 内检查、修复并验证 shift-byte 问题。

## 可以做什么

- 用 HEX ON custom editor 打开本地文件。
- 以可编辑的 high/low hex-nibble 行查看原始文件字节。
- 根据所选编码显示只读字符预览。
- 通过替换 nibble、插入 `00` 或删除 byte 来编辑内容。
- 将支持的 IBM EBCDIC SBCS 与 DBCS 字节预览为文本。
- 检查 IBM EBCDIC DBCS SO/SI 结构与 DBCS ambiguous 警告。
- 从 diagnostics 跳转到精确的 byte 位置。
- 将编辑后的字节保存回磁盘，然后回到 VS Code 默认编辑器。
- 启用 Condense Mode，让每行显示更多 bytes。
- 收合 header，并可选择在 byte grid 上方显示 column ruler。

## 截图

当前 webview 体验的截图如下。完整截图清单、文件名与手动 fixture 设置记录在 [docs/screenshots.md](docs/screenshots.md)。Marketplace 文案草稿记录在 [docs/marketplace.md](docs/marketplace.md)。

![Standard HEX ON editor](images/screenshots/hex-on-standard.png)

![Expanded DBCS diagnostics](images/screenshots/diagnostics-expanded.png)

![Condense Mode with column ruler](images/screenshots/condense-mode.png)

## 安装

### 从 VSIX 安装

构建包：

```sh
npm install
npm run package:vsix
```

在 VS Code 中安装 `dist/ibm-z-hex-on-editor.vsix`：

1. 打开 Extensions 视图。
2. 执行 `Extensions: Install from VSIX...`。
3. 选择 `dist/ibm-z-hex-on-editor.vsix`。
4. 如果 VS Code 提示，请重新加载。

安装或更新 VSIX 后，如果设置页的语言文字没有立即更新，请执行 `Developer: Reload Window`，或重新启动 VS Code / IBM Bob。

若要使用干净的 VS Code profile 进行可重复验证，请参考 [docs/acceptance-checklist.md](docs/acceptance-checklist.md)。

### 从源码运行

```sh
npm install
npm run compile
```

用 VS Code 打开此 repository，按 `F5` 启动 Extension Development Host。

## 基本使用

1. 在 VS Code 中打开本地文件。
2. 从 Command Palette、editor title menu 或 editor context menu 执行 `IBM Z Hex Editor: Open HEX ON`。
3. 如果当前文件有未保存更改，请先保存。
4. 选择磁盘上实际文件内容使用的编码。
5. 在 HEX ON 视图中编辑 bytes。
6. 按 `Ctrl+S` 或点击 `Save`。

当文件 bytes 使用支持的 IBM EBCDIC SBCS 或 DBCS code page 时，请选择该编码，即使 VS Code 之前是用其他文本编码显示文件也一样。

如果手动输入尚未支持的 IBM-style code page id，extension 会先显示警告。原始 byte 编辑仍可使用，但 preview、row splitting 与 diagnostics 会改用通用 fallback 行为。

在 HEX ON editor 内按 `Ctrl+F` 可以打开搜索。输入条件后按搜索按钮才会搜索当前 snapshot；浏览搜索结果期间，输入框会锁定，直到按下取消搜索。Unicode 搜索支持 `.` 与不跨编辑行的 `*` 通配符，也支持用 `\.` 与 `\*` 搜索字面符号。开头 `*` 会延伸到当前编辑行开头，结尾 `*` 会延伸到当前编辑行结尾。Hex 搜索接受用空格分隔的 bytes，例如 `A6 4F` 或 `0xA6 0x4F`。

## 设置

- `ibmZHexEditor.maxFileSizeKb`：HEX ON editor 可打开的本地文件大小上限，单位为 KB。
- `ibmZHexEditor.condenseMode`：显示更紧凑的 grid，使用更窄的 byte cell、隐藏 offset，并移除 grid 边缘 padding。
- `ibmZHexEditor.showRuler`：在 byte grid 上方显示 column ruler。
- `ibmZHexEditor.renderMode`：选择一次呈现整份文件，或一次只呈现一个分页。
- `ibmZHexEditor.pageLineLimit`：分页模式下单一分页最多显示的逻辑行数。可选 `30`、`50`、`100`；没有明确换行的文件会对应为每页 `3000`、`5000`、`10000` bytes。
- `ibmZHexEditor.performanceLogging`：将 editor timing logs 写入 `IBM Z HEX ON Performance` output channel。默认停用。
- `ibmZHexEditor.dbcsAmbiguousExclusionsEnabled`：对 `DBCS_AMBIGUOUS` warnings 使用自定义 byte-pair exclusions。
- `ibmZHexEditor.dbcsAmbiguousExclusions`：byte-pair rules，例如 `{ "bytes": "40 40", "label": "EBCDIC spaces" }`。第一次启用自定义 exclusions 时，extension 会将默认 rules 写入 user settings JSON 以便编辑。

## 文档

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

## 当前限制

- 仅支持本地文件。
- IBM-037、IBM-500、IBM-1047、IBM-1140 有 SBCS preview 支持，但没有 DBCS diagnostics。
- IBM-930、IBM-933、IBM-935、IBM-937、IBM-939、IBM-1364、IBM-1371、IBM-1388、IBM-1390、IBM-1399 有 SO/SI DBCS diagnostics。
- 其他 IBM EBCDIC SBCS 或 DBCS code pages 可在取得 fixtures 与 tests 后，通过 generated-table workflow 加入。
- 已提供繁体中文、简体中文、日文、韩文、德文的第一版多语言内容；对外发布前仍建议进行产品本地化审阅。

## 开发验证

```sh
npm run type-check
npm test
npm run package:vsix
```
