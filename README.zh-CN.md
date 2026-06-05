# IBM Z HEX ON Editor

[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Deutsch](README.de.md)

![IBM Z HEX ON Editor icon](images/icon.png)

IBM Z HEX ON Editor 为 VS Code 提供 ISPF 风格的字节编辑器。你可以打开本地文件或受支持的 Zowe 资源，选择字节实际使用的编码，直接编辑高位与低位 hex nibble，并将更新后的原始字节写回文件。

当前 MVP 主要聚焦 IBM EBCDIC 与 UTF-8 工作流。IBM-037、IBM-500、IBM-1047、IBM-1140 提供 SBCS 预览支持。IBM-930、IBM-933、IBM-935、IBM-937、IBM-939、IBM-1364、IBM-1371、IBM-1388、IBM-1390、IBM-1399 提供 DBCS 的 SO/SI 结构诊断，让你可以直接在 VS Code 中检查、修复并验证 shift-byte 问题。

对于从 Zowe Explorer 树视图打开、且属于固定长度的 Zowe data set member，HEX ON 现在会优先使用 direct binary save，再视需要退回 text-based upload fallback。这样可以让经过验证的 raw-byte 编辑尽量保留在 binary 路径上，并避免 Zowe Explorer 常见的误报“数据丢失”警告。

## 你可以做什么

- 以 HEX ON custom editor 打开本地文件、Zowe data set 或 Zowe USS 文件。
- 识别当前编辑器使用的是 local raw bytes、Zowe host raw bytes 还是 Zowe text-backed bytes。
- 对受支持的固定长度 Zowe data set member 使用更安全的 direct-binary save。
- 以可编辑的 high/low hex-nibble rows 查看 raw file bytes。
- 用所选编码显示只读字符预览。
- 通过修改 nibble、插入 `00`、删除 byte 来编辑内容。
- 预览受支持的 IBM EBCDIC SBCS 与 DBCS 字节文本。
- 检查 IBM EBCDIC DBCS 的 SO/SI 结构与 DBCS ambiguity warnings。
- 从 diagnostics 直接跳转到对应 byte 位置。
- 将编辑后的字节写回文件，并在完成后返回 VS Code 默认编辑器。
- 启用 Condense Mode，在每行显示更多 bytes。
- 折叠 header，并按需在 byte grid 上方显示 column ruler。

## 截图

当前 webview 体验的截图如下。完整截图清单、文件名与手动 fixture 准备方式记录在 [docs/screenshots.md](docs/screenshots.md)。Marketplace 使用的文案草稿记录在 [docs/marketplace.md](docs/marketplace.md)。

![Standard HEX ON editor](images/screenshots/hex-on-standard.png)

![Expanded DBCS diagnostics](images/screenshots/diagnostics-expanded.png)

![Condense Mode with column ruler](images/screenshots/condense-mode.png)

## 安装

### 从 VSIX 安装

先构建安装包：

```sh
npm install
npm run package:vsix
```

在 VS Code 中安装 `dist/ibm-z-hex-on-editor.vsix`：

1. 打开 Extensions 视图。
2. 执行 `Extensions: Install from VSIX...`。
3. 选择 `dist/ibm-z-hex-on-editor.vsix`。
4. 如果系统提示，重新加载 VS Code。

如果安装或更新 VSIX 后，本地化设置文字没有立即更新，请执行 `Developer: Reload Window`，或重新启动 VS Code / IBM Bob。

如果要用干净的 VS Code profile 做可重复验证，请参考 [docs/acceptance-checklist.md](docs/acceptance-checklist.md)。

### 从源码运行

```sh
npm install
npm run compile
```

在 VS Code 中打开此 repository，并按 `F5` 启动 Extension Development Host。

## 基本用法

1. 在 VS Code 中打开本地文件，或在 Zowe Explorer 中选择受支持的 data set/member 或 USS 文件。
2. 从 Command Palette、editor title menu、editor context menu 或 Zowe Explorer tree context menu 执行 `IBM Z Hex Editor: Open HEX ON`。
3. 如果当前文件存在未保存更改，请先保存。
4. 选择磁盘上字节实际使用的 file-content encoding。
5. 在 HEX ON 视图中编辑 bytes。
6. 按 `Ctrl+S` 或点击 `Save`。

如果文件字节使用受支持的 IBM EBCDIC SBCS 或 DBCS code page，请选择对应编码，即使 VS Code 之前是用其他文本编码显示该文件。

如果手动输入尚未支持的 IBM-style code page id，extension 会在打开前显示警告。raw byte editing 仍然可以继续，但 preview、row splitting 与 diagnostics 会退回 generic fallback behavior。

在 HEX ON editor 中按 `Ctrl+F` 可打开搜索。输入查询后点击搜索按钮，会在当前 snapshot 中搜索；当你在结果之间导航时，输入框会被锁定，直到按下取消搜索。Unicode 搜索支持 `.` 与限制在同一 editor line 内的 `*` 通配符，也支持 `\.` 与 `\*` 搜索字面值。前置 `*` 会将匹配扩展到当前 editor line 的开头，结尾 `*` 会扩展到当前 editor line 的结尾。Hex 搜索接受以空格分隔的 bytes，例如 `A6 4F` 或 `0xA6 0x4F`。

## 设置

- `ibmZHexEditor.maxFileSizeKb`: 可在 HEX ON editor 中打开的最大资源大小，单位为 KB。
- `ibmZHexEditor.condenseMode`: 显示更紧凑的 grid，包括更窄的 byte cells、隐藏 offsets，以及移除 grid edge padding。
- `ibmZHexEditor.showRuler`: 在 byte grid 上方显示 column ruler。
- `ibmZHexEditor.renderMode`: 选择显示整个文件，或一次只显示一页。
- `ibmZHexEditor.pageLineLimit`: paged mode 每页最多显示的 logical lines。可选 `30`、`50`、`100`；如果文件没有明确换行，则分别对应 `3000`、`5000`、`10000` bytes。
- `ibmZHexEditor.performanceLogging`: 将 editor timing logs 写入 `IBM Z HEX ON Performance` output channel，默认关闭。
- `ibmZHexEditor.dbcsAmbiguousExclusionsEnabled`: 为 `DBCS_AMBIGUOUS` warnings 启用 custom byte-pair exclusions。
- `ibmZHexEditor.dbcsAmbiguousExclusions`: byte-pair rules，例如 `{ "bytes": "40 40", "label": "EBCDIC spaces" }`。首次启用 custom exclusions 时，extension 会将默认规则写入 user settings JSON 供你编辑。

## 文档

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

## 当前限制

- 支持本地文件与 Zowe Explorer `zowe-ds` / `zowe-uss` 资源。
- 如果要获得最可靠的 Zowe host raw-byte editing，请从 Zowe Explorer 树视图启动 HEX ON。对于受支持的固定长度 `zowe-ds:` member，这条路径也会优先走 direct binary save；如果是从已打开的 Zowe 文本编辑器进入，仍可能沿用文本传输编码与 fallback save 行为。
- 如果 Zowe 资源已经在普通文本编辑器中打开，再从该编辑器启动 HEX ON，header 会显示 `Zowe text-backed bytes`。这对文本导向修改可能有帮助，但不能替代用于修复 SO/SI 或损坏 DBCS byte sequences 的 raw-byte 路径。
- IBM-037、IBM-500、IBM-1047、IBM-1140 提供 SBCS preview，但没有 DBCS diagnostics。
- IBM-930、IBM-933、IBM-935、IBM-937、IBM-939、IBM-1364、IBM-1371、IBM-1388、IBM-1390、IBM-1399 提供 SO/SI DBCS diagnostics。
- 其他 IBM EBCDIC SBCS 或 DBCS code pages 可在 fixtures 与 tests 就绪后，通过 generated-table workflow 扩展。
- 当前提供繁体中文、简体中文、日文、韩文与德文的第一轮本地化，但在对外正式发布前，仍建议进行产品级语言审校。

## 开发验证

```sh
npm run type-check
npm test
npm run package:vsix
```
