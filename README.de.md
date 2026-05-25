# IBM Z HEX ON Editor

[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Deutsch](README.de.md)

![IBM Z HEX ON Editor icon](images/icon.png)

IBM Z HEX ON Editor ergänzt VS Code um einen ISPF-ähnlichen Byte-Editor. Öffnen Sie eine lokale Datei, wählen Sie die tatsächliche Codierung der Bytes auf dem Datenträger, bearbeiten Sie die oberen und unteren Hex-Nibbles direkt und speichern Sie die aktualisierten Rohbytes zurück in die Datei.

Der aktuelle MVP konzentriert sich auf IBM EBCDIC- und UTF-8-Workflows. IBM-037-, IBM-500-, IBM-1047- und IBM-1140-Dateien erhalten SBCS-Vorschauunterstützung. IBM-930-, IBM-933-, IBM-935-, IBM-937-, IBM-939-, IBM-1364-, IBM-1371-, IBM-1388-, IBM-1390- und IBM-1399-Dateien erhalten SO/SI-Strukturdiagnosen für DBCS-Daten, damit Shift-Byte-Probleme direkt in VS Code geprüft, repariert und validiert werden können.

## Funktionen

- Lokale Dateien in einem HEX ON custom editor öffnen.
- Raw file bytes als editierbare high/low hex-nibble rows anzeigen.
- Eine schreibgeschützte Zeichenvorschau mit der gewählten Codierung anzeigen.
- Bytes durch Ersetzen von Nibbles, Einfügen von `00` oder Löschen von Bytes bearbeiten.
- Unterstützte IBM EBCDIC SBCS- und DBCS-Bytes als Text anzeigen.
- IBM EBCDIC DBCS SO/SI-Struktur und DBCS ambiguous warnings prüfen.
- Von diagnostics zur genauen Byteposition springen.
- Bearbeitete Bytes auf den Datenträger speichern und danach zum Standardeditor von VS Code zurückkehren.
- Condense Mode aktivieren, um mehr Bytes pro Zeile anzuzeigen.
- Den header einklappen und optional einen column ruler über dem byte grid anzeigen.

## Screenshots

Screenshots der aktuellen Webview-Erfahrung sind unten aufgeführt. Die vollständige Liste, Dateinamen und manuelle Fixture-Einrichtung werden in [docs/screenshots.md](docs/screenshots.md) verfolgt. Der Entwurf für den Marketplace-Text steht in [docs/marketplace.md](docs/marketplace.md).

![Standard HEX ON editor](images/screenshots/hex-on-standard.png)

![Expanded DBCS diagnostics](images/screenshots/diagnostics-expanded.png)

![Condense Mode with column ruler](images/screenshots/condense-mode.png)

## Installation

### Installation aus VSIX

Paket erstellen:

```sh
npm install
npm run package:vsix
```

`dist/ibm-z-hex-on-editor.vsix` in VS Code installieren:

1. Extensions-Ansicht öffnen.
2. `Extensions: Install from VSIX...` ausführen.
3. `dist/ibm-z-hex-on-editor.vsix` auswählen.
4. VS Code neu laden, falls Sie dazu aufgefordert werden.

Für wiederholbare Validierung mit einem sauberen VS Code profile siehe [docs/acceptance-checklist.md](docs/acceptance-checklist.md).

### Aus dem Quellcode ausführen

```sh
npm install
npm run compile
```

Dieses repository in VS Code öffnen und `F5` drücken, um einen Extension Development Host zu starten.

## Grundlegende Verwendung

1. Eine lokale Datei in VS Code öffnen.
2. `IBM Z Hex Editor: Open HEX ON` über Command Palette, editor title menu oder editor context menu ausführen.
3. Wenn die aktuelle Datei ungespeicherte Änderungen enthält, zuerst speichern.
4. Die tatsächliche file-content encoding der Bytes auf dem Datenträger auswählen.
5. Bytes in der HEX ON-Ansicht bearbeiten.
6. `Ctrl+S` drücken oder `Save` auswählen.

Wählen Sie eine unterstützte IBM EBCDIC SBCS- oder DBCS-Codierung, wenn die Datei-Bytes diese code page verwenden, auch wenn VS Code die Datei zuvor mit einer anderen text encoding angezeigt hat.

Wenn eine noch nicht unterstützte IBM-style code page id manuell eingegeben wird, zeigt die extension vor dem Öffnen eine Warnung an. Raw byte editing funktioniert weiterhin, aber preview, row splitting und diagnostics verwenden generic fallback behavior.

## Einstellungen

- `ibmZHexEditor.maxFileSizeKb`: Maximale lokale Dateigröße in KB, die im HEX ON editor geöffnet werden kann.
- `ibmZHexEditor.condenseMode`: Zeigt ein dichteres grid mit schmaleren byte cells, ausgeblendeten offsets und ohne grid edge padding.
- `ibmZHexEditor.showRuler`: Zeigt einen column ruler über dem byte grid.
- `ibmZHexEditor.dbcsAmbiguousExclusionsEnabled`: Verwendet custom byte-pair exclusions für `DBCS_AMBIGUOUS` warnings.
- `ibmZHexEditor.dbcsAmbiguousExclusions`: Byte-pair rules wie `{ "bytes": "40 40", "label": "EBCDIC spaces" }`. Wenn custom exclusions erstmals aktiviert werden, schreibt die extension die Standardregeln zur Bearbeitung in user settings JSON.

## Dokumentation

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

## Aktuelle Einschränkungen

- Nur lokale Dateien.
- IBM-037, IBM-500, IBM-1047 und IBM-1140 haben SBCS preview support, aber keine DBCS diagnostics.
- IBM-930, IBM-933, IBM-935, IBM-937, IBM-939, IBM-1364, IBM-1371, IBM-1388, IBM-1390 und IBM-1399 haben SO/SI DBCS diagnostics.
- Weitere IBM EBCDIC SBCS- oder DBCS-code pages können über den generated-table workflow ergänzt werden, sobald fixtures und tests verfügbar sind.
- First-pass localization ist für traditionelles Chinesisch, vereinfachtes Chinesisch, Japanisch, Koreanisch und Deutsch verfügbar. Vor externer Veröffentlichung wird weiterhin eine Produktlokalisierungsprüfung empfohlen.

## Entwicklungsprüfung

```sh
npm run type-check
npm test
npm run package:vsix
```
