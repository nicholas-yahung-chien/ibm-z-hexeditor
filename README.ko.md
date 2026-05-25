# IBM Z HEX ON Editor

[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Deutsch](README.de.md)

![IBM Z HEX ON Editor icon](images/icon.png)

IBM Z HEX ON Editor는 VS Code에 ISPF 스타일의 바이트 편집기를 추가합니다. 로컬 파일을 열고, 디스크에 실제로 저장된 내용 인코딩을 선택하고, high/low hex nibbles를 직접 편집한 뒤 업데이트된 raw bytes를 파일에 다시 저장할 수 있습니다.

현재 MVP는 IBM EBCDIC 및 UTF-8 워크플로에 집중합니다. IBM-037, IBM-500, IBM-1047, IBM-1140 파일은 SBCS 미리 보기를 지원합니다. IBM-930, IBM-933, IBM-935, IBM-937, IBM-939, IBM-1364, IBM-1371, IBM-1388, IBM-1390, IBM-1399 파일은 DBCS 데이터의 SO/SI 구조 진단을 지원하므로 VS Code 안에서 shift-byte 문제를 검사, 수정, 검증할 수 있습니다.

## 할 수 있는 작업

- 로컬 파일을 HEX ON custom editor로 열기.
- raw file bytes를 편집 가능한 high/low hex-nibble 행으로 보기.
- 선택한 인코딩으로 디코딩된 읽기 전용 문자 preview 보기.
- nibble 교체, `00` 삽입, byte 삭제로 내용 편집.
- 지원되는 IBM EBCDIC SBCS 및 DBCS bytes를 텍스트로 preview.
- IBM EBCDIC DBCS SO/SI 구조와 DBCS ambiguous warning 검사.
- diagnostics에서 정확한 byte 위치로 이동.
- 편집된 bytes를 디스크에 저장한 뒤 VS Code 기본 편집기로 돌아가기.
- Condense Mode를 활성화해 한 행에 더 많은 bytes 표시.
- header를 접고, 필요하면 byte grid 위에 column ruler 표시.

## 스크린샷

현재 webview 경험의 스크린샷은 아래와 같습니다. 전체 캡처 목록, 파일 이름, 수동 fixture 설정은 [docs/screenshots.md](docs/screenshots.md)에 기록되어 있습니다. Marketplace용 설명 초안은 [docs/marketplace.md](docs/marketplace.md)에 있습니다.

![Standard HEX ON editor](images/screenshots/hex-on-standard.png)

![Expanded DBCS diagnostics](images/screenshots/diagnostics-expanded.png)

![Condense Mode with column ruler](images/screenshots/condense-mode.png)

## 설치

### VSIX에서 설치

패키지를 빌드합니다.

```sh
npm install
npm run package:vsix
```

VS Code에서 `dist/ibm-z-hex-on-editor.vsix`를 설치합니다.

1. Extensions 보기를 엽니다.
2. `Extensions: Install from VSIX...`를 실행합니다.
3. `dist/ibm-z-hex-on-editor.vsix`를 선택합니다.
4. VS Code에서 요청하면 다시 로드합니다.

깨끗한 VS Code profile로 반복 가능한 검증을 하려면 [docs/acceptance-checklist.md](docs/acceptance-checklist.md)를 참고하세요.

### 소스에서 실행

```sh
npm install
npm run compile
```

이 repository를 VS Code에서 열고 `F5`를 눌러 Extension Development Host를 시작합니다.

## 기본 사용법

1. VS Code에서 로컬 파일을 엽니다.
2. Command Palette, editor title menu 또는 editor context menu에서 `IBM Z Hex Editor: Open HEX ON`을 실행합니다.
3. 현재 파일에 저장되지 않은 변경 사항이 있으면 먼저 저장합니다.
4. 디스크에 실제로 저장된 file-content encoding을 선택합니다.
5. HEX ON 보기에서 bytes를 편집합니다.
6. `Ctrl+S`를 누르거나 `Save`를 클릭합니다.

파일 bytes가 지원되는 IBM EBCDIC SBCS 또는 DBCS code page를 사용하는 경우, VS Code가 이전에 다른 text encoding으로 파일을 표시했더라도 실제 code page를 선택하세요.

지원되지 않는 IBM-style code page id를 직접 입력하면 extension이 열기 전에 경고를 표시합니다. raw byte editing은 계속 사용할 수 있지만 preview, row splitting, diagnostics는 generic fallback behavior를 사용합니다.

## 설정

- `ibmZHexEditor.maxFileSizeKb`: HEX ON editor에서 열 수 있는 로컬 파일의 최대 크기(KB).
- `ibmZHexEditor.condenseMode`: 더 좁은 byte cell, 숨겨진 offset, grid edge padding 제거로 더 조밀한 grid를 표시합니다.
- `ibmZHexEditor.showRuler`: byte grid 위에 column ruler를 표시합니다.
- `ibmZHexEditor.dbcsAmbiguousExclusionsEnabled`: `DBCS_AMBIGUOUS` warnings에 custom byte-pair exclusions를 사용합니다.
- `ibmZHexEditor.dbcsAmbiguousExclusions`: `{ "bytes": "40 40", "label": "EBCDIC spaces" }` 같은 byte-pair rules. custom exclusions를 처음 활성화하면 extension이 기본 rules를 user settings JSON에 기록하여 편집할 수 있게 합니다.

## 문서

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

## 현재 제한 사항

- 로컬 파일만 지원합니다.
- IBM-037, IBM-500, IBM-1047, IBM-1140은 SBCS preview를 지원하지만 DBCS diagnostics는 없습니다.
- IBM-930, IBM-933, IBM-935, IBM-937, IBM-939, IBM-1364, IBM-1371, IBM-1388, IBM-1390, IBM-1399는 SO/SI DBCS diagnostics를 지원합니다.
- 추가 IBM EBCDIC SBCS 또는 DBCS code pages는 fixtures와 tests가 준비된 뒤 generated-table workflow로 추가할 수 있습니다.
- 중국어 번체, 중국어 간체, 일본어, 한국어, 독일어 first-pass localization이 제공됩니다. 외부 공개 전 제품 로컬라이제이션 검토를 권장합니다.

## 개발 검증

```sh
npm run type-check
npm test
npm run package:vsix
```
