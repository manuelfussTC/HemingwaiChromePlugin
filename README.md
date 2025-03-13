# Hemingwai Chrome-Plugin

Dieses Chrome-Plugin ermöglicht es dir, die Hemingwai KI-Funktionen direkt in deinem Browser zu nutzen. Wähle aus verschiedenen Hemingwai-Endpoints, gib die erforderlichen Parameter ein und erhalte sofort Ergebnisse - alles ohne die Hemingwai-Website besuchen zu müssen.

## Funktionen

- **Dynamisches Endpoint-Dropdown**: Wähle aus allen verfügbaren Hemingwai-Endpoints
- **Automatische Parameter-Erkennung**: Das Plugin lädt automatisch die benötigten Eingabefelder für jeden Endpoint
- **Kontextmenü-Integration**: Markiere Text auf einer Webseite und verarbeite ihn direkt mit Hemingwai
- **Ergebnis-Kopieren**: Kopiere das Ergebnis mit einem Klick in die Zwischenablage

## Installation

1. Lade das Plugin herunter oder klone dieses Repository
2. Öffne Chrome und navigiere zu `chrome://extensions/`
3. Aktiviere den "Entwicklermodus" (oben rechts)
4. Klicke auf "Entpackte Erweiterung laden" und wähle den Ordner mit dem Plugin aus
5. Das Plugin sollte nun in der Chrome-Toolbar erscheinen

## Verwendung

1. Klicke auf das Hemingwai-Icon in der Chrome-Toolbar
2. Gib deinen Hemingwai API-Schlüssel ein und speichere ihn
3. Wähle einen Endpoint aus dem Dropdown-Menü
4. Fülle die angezeigten Parameter aus
5. Klicke auf "Verarbeiten"
6. Das Ergebnis wird angezeigt und kann mit einem Klick kopiert werden

### Kontextmenü-Funktion

1. Markiere Text auf einer beliebigen Webseite
2. Rechtsklick → "Mit Hemingwai verarbeiten"
3. Das Plugin öffnet sich und der markierte Text wird automatisch in das passende Eingabefeld eingefügt
4. Wähle einen Endpoint und klicke auf "Verarbeiten"

## Entwicklung

### Projektstruktur

- `manifest.json`: Konfiguration des Chrome-Plugins
- `popup.html`: Hauptbenutzeroberfläche des Plugins
- `popup.js`: JavaScript-Logik für die Benutzeroberfläche
- `styles.css`: Styling für die Benutzeroberfläche
- `background.js`: Hintergrund-Service-Worker für Kontextmenü-Funktionen
- `icons/`: Verzeichnis mit Plugin-Icons

### Lokale Entwicklung

1. Nimm Änderungen an den Dateien vor
2. Aktualisiere die Plugin-Seite in Chrome (`chrome://extensions/`)
3. Klicke auf das Reload-Symbol bei deinem Plugin
4. Teste die Änderungen

## Lizenz

Dieses Projekt ist urheberrechtlich geschützt. Alle Rechte vorbehalten. # HemingwaiChromePlugin
