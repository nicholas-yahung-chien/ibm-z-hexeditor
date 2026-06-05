# IBM Z HEX ON Editor

[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Deutsch](README.de.md)

![IBM Z HEX ON Editor icon](images/icon.png)

IBM Z HEX ON Editor erweitert VS Code um einen ISPF-ähnlichen Byte-Editor. Sie können lokale Dateien oder unterstützte Zowe-Ressourcen öffnen, die tatsächliche Byte-Codierung auswählen, die oberen und unteren hex nibble direkt bearbeiten und die aktualisierten raw bytes wieder in die Datei speichern.

Der aktuelle MVP konzentriert sich auf IBM EBCDIC- und UTF-8-Workflows. Dateien mit IBM-037, IBM-500, IBM-1047 und IBM-1140 erhalten SBCS-Vorschauunterstützung. Dateien mit IBM-930, IBM-933, IBM-935, IBM-937, IBM-939, IBM-1364, IBM-1371, IBM-1388, IBM-1390 und IBM-1399 erhalten SO/SI-Strukturdiagnosen für DBCS-Daten, damit shift-byte-Probleme direkt in VS Code geprüft, repariert und verifiziert werden können.

Für feste Zowe data set member, die aus der Zowe-Explorer-Baumansicht geöffnet werden, bevorzugt HEX ON jetzt zuerst direct binary save und fällt nur bei Bedarf auf text-based upload fallback zurück. Dadurch bleibt validiertes raw-byte editing möglichst auf dem binary-Pfad und typische Fehlwarnungen von Zowe Explorer zu möglichem "data loss" werden reduziert.

## Funktionen

- Lokale Dateien, Zowe data sets und Zowe USS-Dateien in einem HEX ON custom editor öffnen.
- Erkennen, ob der aktuelle Editor local raw bytes, Zowe host raw bytes oder Zowe text-backed bytes verwendet.
- Für unterstützte feste Zowe data set member einen sichereren direct-binary save verwenden.
- raw file bytes als editierbare high/low hex-nibble rows anzeigen.
- Eine schreibgeschützte Zeichenvorschau mit der ausgewählten Codierung anzeigen.
- Bytes durch Ersetzen von nibble-Werten, Einfügen von `00` oder Löschen von bytes bearbeiten.
- Unterstützte IBM EBCDIC SBCS- und DBCS-Textvorschau anzeigen.
- IBM EBCDIC DBCS SO/SI-Struktur und DBCS ambiguity warnings prüfen.
- Von diagnostics direkt zur passenden byte-Position springen.
- Bearbeitete bytes speichern und danach zum Standardeditor von VS Code zurückkehren.
- Condense Mode aktivieren, um mehr bytes pro Zeile anzuzeigen.
- Den header einklappen und optional einen column ruler über dem byte grid anzeigen.

## Screenshots

Screenshots der aktuellen Webview-Erfahrung sind unten aufgeführt. Die vollständige Liste, Dateinamen und die manuelle Vorbereitung der fixtures sind in [docs/screenshots.md](docs/screenshots.md) dokumentiert. Der Marketplace-Textentwurf befindet sich in [docs/marketplace.md](docs/marketplace.md).

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
4. VS Code neu laden, wenn Sie dazu aufgefordert werden.

Wenn lokalisierte Einstellungstexte nach dem Installieren oder Aktualisieren einer VSIX nicht sofort aktualisiert werden, führen Sie `Developer: Reload Window` aus oder starten Sie VS Code / IBM Bob neu.

Für reproduzierbare Validierung mit einem sauberen VS Code profile siehe [docs/acceptance-checklist.md](docs/acceptance-checklist.md).

### Aus dem Quellcode ausführen

```sh
npm install
npm run compile
```

Dieses repository in VS Code öffnen und `F5` drücken, um einen Extension Development Host zu starten.

## Grundlegende Verwendung

1. Eine lokale Datei in VS Code öffnen oder in Zowe Explorer ein unterstütztes data set/member oder eine USS-Datei auswählen.
2. `IBM Z Hex Editor: Open HEX ON` über Command Palette, editor title menu, editor context menu oder das Zowe Explorer tree context menu ausführen.
3. Wenn die aktuelle Datei ungespeicherte Änderungen enthält, zuerst speichern.
4. Die tatsächliche file-content encoding der bytes auf dem Datenträger auswählen.
5. Die bytes in der HEX ON-Ansicht bearbeiten.
6. `Ctrl+S` drücken oder `Save` anklicken.

Wählen Sie eine unterstützte IBM EBCDIC SBCS- oder DBCS-code page, wenn die Datei-bytes diese Codierung verwenden, auch wenn VS Code die Datei zuvor mit einer anderen text encoding angezeigt hat.

Wenn eine noch nicht unterstützte IBM-style code page id manuell eingegeben wird, zeigt die extension vor dem Öffnen eine Warnung an. raw byte editing funktioniert weiterhin, aber preview, row splitting und diagnostics verwenden generic fallback behavior.

Mit `Ctrl+F` im HEX ON editor öffnen Sie die Suche. Geben Sie eine Abfrage ein und klicken Sie auf die Suchschaltfläche, um den aktuellen snapshot zu durchsuchen. Während der Ergebnisnavigation ist die Eingabe gesperrt, bis die Suche abgebrochen wird. Die Unicode-Suche unterstützt `.` und ein auf dieselbe editor line begrenztes `*` als Platzhalter sowie `\.` und `\*` für literale Zeichen. Ein führendes `*` erweitert den Treffer bis zum Anfang der aktuellen editor line, ein abschließendes `*` bis zum Ende der aktuellen editor line. Die Hex-Suche akzeptiert durch Leerzeichen getrennte bytes wie `A6 4F` oder `0xA6 0x4F`.

## Einstellungen

- `ibmZHexEditor.maxFileSizeKb`: Maximale Ressourcengröße in KB, die im HEX ON editor geöffnet werden kann.
- `ibmZHexEditor.condenseMode`: Zeigt ein dichteres grid mit schmaleren byte cells, ausgeblendeten offsets und ohne grid edge padding.
- `ibmZHexEditor.showRuler`: Zeigt einen column ruler über dem byte grid.
- `ibmZHexEditor.renderMode`: Legt fest, ob die gesamte Datei oder jeweils nur eine Seite angezeigt wird.
- `ibmZHexEditor.pageLineLimit`: Maximale Anzahl logischer Zeilen pro Seite im paged mode. Wählbar sind `30`, `50` oder `100`; Dateien ohne explizite Zeilenumbrüche verwenden entsprechend `3000`, `5000` oder `10000` bytes.
- `ibmZHexEditor.performanceLogging`: Schreibt editor timing logs in den output channel `IBM Z HEX ON Performance`. Standardmäßig deaktiviert.
- `ibmZHexEditor.dbcsAmbiguousExclusionsEnabled`: Verwendet custom byte-pair exclusions für `DBCS_AMBIGUOUS` warnings.
- `ibmZHexEditor.dbcsAmbiguousExclusions`: Byte-pair rules wie `{ "bytes": "40 40", "label": "EBCDIC spaces" }`. Beim ersten Aktivieren von custom exclusions schreibt die extension die Standardregeln in user settings JSON.

## Dokumentation

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

## Aktuelle Einschränkungen

- Unterstützt lokale Dateien sowie Zowe Explorer `zowe-ds` / `zowe-uss` Ressourcen.
- Für das zuverlässigste Zowe host raw-byte editing sollte HEX ON aus der Zowe-Explorer-Baumansicht gestartet werden. Für unterstützte feste `zowe-ds:` member wird auf diesem Pfad direct binary save bevorzugt; aus einem bereits geöffneten Zowe-Texteditor heraus können weiterhin text-transfer encoding und fallback save behavior übernommen werden.
- Wenn eine Zowe-Ressource bereits in einem normalen Texteditor geöffnet ist und HEX ON von dort gestartet wird, zeigt der header `Zowe text-backed bytes` an. Das kann für textorientierte Änderungen nützlich sein, ersetzt aber nicht den raw-byte-Pfad zur Reparatur von SO/SI oder beschädigten DBCS byte sequences.
- IBM-037, IBM-500, IBM-1047 und IBM-1140 bieten SBCS preview, aber keine DBCS diagnostics.
- IBM-930, IBM-933, IBM-935, IBM-937, IBM-939, IBM-1364, IBM-1371, IBM-1388, IBM-1390 und IBM-1399 bieten SO/SI DBCS diagnostics.
- Weitere IBM EBCDIC SBCS- oder DBCS-code pages können ergänzt werden, sobald fixtures und tests für den generated-table workflow verfügbar sind.
- Derzeit gibt es first-pass localization für traditionelles Chinesisch, vereinfachtes Chinesisch, Japanisch, Koreanisch und Deutsch, vor einer externen Veröffentlichung wird aber weiterhin eine sprachliche Produktprüfung empfohlen.

## Entwicklungsprüfung

```sh
npm run type-check
npm test
npm run package:vsix
```
