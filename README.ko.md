# IBM Z HEX ON Editor

[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Deutsch](README.de.md)

![IBM Z HEX ON Editor icon](images/icon.png)

IBM Z HEX ON Editor는 VS Code에 ISPF 스타일의 바이트 편집기를 제공합니다. 로컬 파일이나 지원되는 Zowe 리소스를 열고, 바이트가 실제로 사용하는 인코딩을 선택한 다음, high/low hex nibble 을 직접 편집하고 업데이트된 raw bytes 를 파일에 저장할 수 있습니다.

현재 MVP는 IBM EBCDIC 및 UTF-8 워크플로에 집중하고 있습니다. IBM-037, IBM-500, IBM-1047, IBM-1140 파일은 SBCS 미리 보기를 제공합니다. IBM-930, IBM-933, IBM-935, IBM-937, IBM-939, IBM-1364, IBM-1371, IBM-1388, IBM-1390, IBM-1399 파일은 DBCS 데이터용 SO/SI 구조 진단을 제공하여 shift-byte 문제를 VS Code 안에서 확인, 수정, 검증할 수 있게 합니다.

Zowe Explorer 트리에서 연 고정 길이 Zowe data set member 에 대해서는 HEX ON 이 먼저 direct binary save 를 시도하고, 필요한 경우에만 text-based upload fallback 으로 돌아갑니다. 이렇게 하면 검증된 raw-byte 편집을 가능한 한 binary 경로에 유지하고, Zowe Explorer 의 잘못된 "data loss" 경고를 줄일 수 있습니다.

## 할 수 있는 일

- 로컬 파일, Zowe data set, Zowe USS 파일을 HEX ON custom editor 로 연다.
- 현재 편집기가 local raw bytes, Zowe host raw bytes, Zowe text-backed bytes 중 무엇을 사용하는지 확인한다.
- 지원되는 고정 길이 Zowe data set member 에 더 안전한 direct-binary save 를 사용한다.
- raw file bytes 를 편집 가능한 high/low hex-nibble rows 로 표시한다.
- 선택한 인코딩으로 읽은 읽기 전용 문자 미리 보기를 표시한다.
- nibble 교체, `00` 삽입, byte 삭제로 편집한다.
- 지원되는 IBM EBCDIC SBCS 및 DBCS 텍스트 미리 보기를 확인한다.
- IBM EBCDIC DBCS 의 SO/SI 구조와 DBCS ambiguity warnings 를 점검한다.
- diagnostics 에서 해당 byte 위치로 바로 이동한다.
- 편집한 bytes 를 저장하고 완료 후 VS Code 기본 편집기로 돌아간다.
- Condense Mode 를 켜서 한 줄에 더 많은 bytes 를 표시한다.
- header 를 접고 필요할 때 byte grid 위에 column ruler 를 표시한다.

## 스크린샷

현재 webview 경험의 스크린샷은 아래와 같습니다. 전체 스크린샷 목록, 파일 이름, 수동 fixture 준비 절차는 [docs/screenshots.md](docs/screenshots.md)에 있습니다. Marketplace 용 문안 초안은 [docs/marketplace.md](docs/marketplace.md)에 있습니다.

![Standard HEX ON editor](images/screenshots/hex-on-standard.png)

![Expanded DBCS diagnostics](images/screenshots/diagnostics-expanded.png)

![Condense Mode with column ruler](images/screenshots/condense-mode.png)

## 설치

### VSIX 로 설치

먼저 패키지를 빌드합니다.

```sh
npm install
npm run package:vsix
```

VS Code 에서 `dist/ibm-z-hex-on-editor.vsix` 를 설치합니다.

1. Extensions 보기를 연다.
2. `Extensions: Install from VSIX...` 를 실행한다.
3. `dist/ibm-z-hex-on-editor.vsix` 를 선택한다.
4. 필요하면 VS Code 를 다시 로드한다.

VSIX 설치 또는 업데이트 후 로컬라이즈된 설정 문자열이 바로 반영되지 않으면 `Developer: Reload Window` 를 실행하거나 VS Code / IBM Bob 을 다시 시작하세요.

깨끗한 VS Code profile 에서 재현 가능한 검증을 하려면 [docs/acceptance-checklist.md](docs/acceptance-checklist.md)를 참고하세요.

### 소스에서 실행

```sh
npm install
npm run compile
```

이 repository 를 VS Code 에서 열고 `F5` 를 눌러 Extension Development Host 를 시작합니다.

## 기본 사용법

1. VS Code 에서 로컬 파일을 열거나, Zowe Explorer 에서 지원되는 data set/member 또는 USS 파일을 선택한다.
2. Command Palette, editor title menu, editor context menu 또는 Zowe Explorer tree context menu 에서 `IBM Z Hex Editor: Open HEX ON` 을 실행한다.
3. 현재 파일에 저장되지 않은 변경이 있으면 먼저 저장한다.
4. 디스크 위 bytes 가 실제로 사용하는 file-content encoding 을 선택한다.
5. HEX ON 보기에서 bytes 를 편집한다.
6. `Ctrl+S` 를 누르거나 `Save` 를 클릭한다.

파일 bytes 가 지원되는 IBM EBCDIC SBCS 또는 DBCS code page 를 사용한다면, VS Code 가 이전에 다른 text encoding 으로 표시했더라도 그 code page 를 선택해야 합니다.

아직 지원되지 않는 IBM-style code page id 를 수동으로 입력하면 extension 이 열기 전에 경고를 표시합니다. raw byte editing 은 계속 가능하지만 preview, row splitting, diagnostics 는 generic fallback behavior 를 사용합니다.

HEX ON editor 에서 `Ctrl+F` 를 누르면 검색 패널이 열립니다. 쿼리를 입력하고 검색 버튼을 누르면 현재 snapshot 을 검색합니다. 결과 탐색 중에는 입력이 잠기며, 검색 취소를 눌러야 다시 수정할 수 있습니다. Unicode 검색은 `.` 과 같은 editor line 안에 제한된 `*` 와일드카드를 지원하며, `\.` 과 `\*` 로 문자 그대로를 검색할 수 있습니다. 앞쪽 `*` 는 현재 editor line 시작까지, 뒤쪽 `*` 는 현재 editor line 끝까지 일치 범위를 확장합니다. Hex 검색은 `A6 4F` 또는 `0xA6 0x4F` 처럼 공백으로 구분된 bytes 를 받습니다.

## 설정

- `ibmZHexEditor.maxFileSizeKb`: HEX ON editor 에서 열 수 있는 최대 리소스 크기(KB).
- `ibmZHexEditor.condenseMode`: 더 좁은 byte cells, 숨겨진 offsets, 제거된 grid edge padding 으로 더 조밀한 grid 를 표시한다.
- `ibmZHexEditor.showRuler`: byte grid 위에 column ruler 를 표시한다.
- `ibmZHexEditor.renderMode`: 전체 파일을 보여줄지, 한 번에 한 페이지씩 보여줄지 선택한다.
- `ibmZHexEditor.pageLineLimit`: paged mode 에서 한 페이지에 표시할 최대 logical lines. `30`, `50`, `100` 을 선택할 수 있으며, 명시적 줄바꿈이 없는 파일은 각각 `3000`, `5000`, `10000` bytes 에 해당한다.
- `ibmZHexEditor.performanceLogging`: editor timing logs 를 `IBM Z HEX ON Performance` output channel 에 기록한다. 기본값은 꺼짐.
- `ibmZHexEditor.dbcsAmbiguousExclusionsEnabled`: `DBCS_AMBIGUOUS` warnings 에 custom byte-pair exclusions 를 사용한다.
- `ibmZHexEditor.dbcsAmbiguousExclusions`: `{ "bytes": "40 40", "label": "EBCDIC spaces" }` 같은 byte-pair rules. custom exclusions 를 처음 활성화하면 extension 이 기본 규칙을 user settings JSON 에 기록한다.

## 문서

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

## 현재 제한 사항

- 로컬 파일과 Zowe Explorer `zowe-ds` / `zowe-uss` 리소스를 지원한다.
- 가장 신뢰할 수 있는 Zowe host raw-byte editing 을 위해서는 Zowe Explorer 트리에서 HEX ON 을 시작해야 한다. 지원되는 고정 길이 `zowe-ds:` member 는 이 경로에서 direct binary save 가 우선되지만, 이미 열려 있는 Zowe 텍스트 편집기에서 들어가면 text-transfer encoding 과 fallback save behavior 를 이어받을 수 있다.
- Zowe 리소스가 일반 텍스트 편집기에서 이미 열려 있는 상태에서 HEX ON 을 시작하면 header 에 `Zowe text-backed bytes` 가 표시된다. 이는 텍스트 중심 수정에는 유용할 수 있지만 SO/SI 또는 손상된 DBCS byte sequences 복구용 raw-byte 경로를 대체하지는 않는다.
- IBM-037, IBM-500, IBM-1047, IBM-1140 은 SBCS preview 를 제공하지만 DBCS diagnostics 는 없다.
- IBM-930, IBM-933, IBM-935, IBM-937, IBM-939, IBM-1364, IBM-1371, IBM-1388, IBM-1390, IBM-1399 는 SO/SI DBCS diagnostics 를 제공한다.
- 다른 IBM EBCDIC SBCS 또는 DBCS code pages 는 fixtures 와 tests 가 준비되면 generated-table workflow 로 확장할 수 있다.
- 현재 번체중국어, 간체중국어, 일본어, 한국어, 독일어의 first-pass localization 을 제공하지만 외부 공개 전에는 제품 수준의 언어 검토를 권장한다.

## 개발 검증

```sh
npm run type-check
npm test
npm run package:vsix
```
