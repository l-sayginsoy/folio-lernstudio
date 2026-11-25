# Lernstudio · Englisch

Lern-App für einen Englischtest (Montag, 23.11.2026). Der Stoff sind die Vokabelseiten 154–156 des Schulbuchs.
Die App ist für einen 14-jährigen Schüler mit Lernschwierigkeiten gedacht: kurze Runden, Hören, Sprechen und vor allem selbst schreiben.

**Online:** https://l-sayginsoy.github.io/folio-lernstudio/

Die App läuft komplett im Browser, auf Handy und Laptop. Der Lernstand wird nur im Browser des jeweiligen Geräts gespeichert (localStorage). Es werden keine Daten an einen Server geschickt.

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html` | Einstieg der App |
| `studio.js` | Ablauf: Lernwelten, Runden, Probetest, Lernstand |
| `studio.css` | Gestaltung |
| `words.js` | Alle 64 Wörter und Wendungen (`WORDS`) und die 4 Lernwelten (`SCENES`). Einzige Quelle für App, Druck und Ton |
| `situations.js` | Kleine Alltagsszenen pro Lernwelt |
| `lernblatt-englisch-test.html` | Druckstudio: Probetest und Schreibtraining mit Lösungen |
| `audio/` | Fertige Tonaufnahmen: `<id>-word.m4a` und `<id>-example.m4a` |
| `assets/` | Schrift (DM Sans, OFL), Icons (Lucide, ISC) und die eigens für Lernstudio mit Imagegen erstellte London-Bus-Illustration |
| `tools/make-audio.mjs` | Erzeugt die Tonaufnahmen mit einer macOS-Stimme (`say`) |
| `tools/studio-server.mjs`, `tools/FolioTutor.swift` | Optional, nur lokal auf dem Mac: KI-Erklärungen mit dem Apple-Sprachmodell auf dem Gerät |
| `Lernstudio starten.command` | Startet die App lokal mit KI-Erklärungen (nur Mac) |

## Ablauf einer Runde

1. **Neue Wörter:** zuerst **Entdecken** (Wort, Bedeutung, anhören, nachsprechen), dann sofort selbst schreiben.
2. **Schon geübte Wörter** kommen in Kapitelrunden direkt zum Schreiben, ohne sie vorher zu zeigen.
3. Bei einem Fehler zeigt die App, wo er steckt. Mit „Ich brauche Hilfe“ sieht er die Lösung, merkt sie sich und schreibt sie aus dem Kopf. Am Ende der Runde kommt das Wort noch einmal.

Geschrieben wird per Tastatur (automatische Prüfung) oder auf Papier (Selbstvergleich).

Pro Bildschirm gibt es **einen** Hauptknopf, immer unten in derselben Leiste. Daneben stehen nur „Zurück“ und beim Schreiben „Überspringen“.

## Lernstand

Drei Stufen, überall gleich benannt:

- **Geübt:** in einer Runde richtig geschrieben, nachdem das Wort gezeigt wurde.
- **Selbst gewusst:** beim ersten Versuch richtig, ohne dass das Wort in dieser Runde vorher gezeigt wurde (spätere Kapitelrunde, Wiederholung, Probetest).
- **An zwei Tagen gekonnt:** selbst gewusst an zwei Tagen mit mindestens 16 Stunden Abstand.

Einstellungen, Probetest-Ergebnisse, Notizen und das Druckstudio liegen im Bereich **Für Eltern** (Knopf oben rechts).

## Festgelegte Entscheidungen der Eltern

Bitte bei Änderungen beibehalten:

- **Keine Frage „Kennst du das schon auf Englisch?“** vor neuen Wörtern. Jedes Wort beginnt direkt mit dem Lernen (Entscheidung vom 21.11.2026).
- **Der Ton bleibt wie er ist.** Die vorhandenen Aufnahmen in `audio/` sind von den Eltern abgenommen. Keine Geräte-Sprachausgabe im Browser verwenden.
- **Keine Daten des Kindes online.** Der Lernstand bleibt auf dem Gerät.
- **Nicht für Suchmaschinen.** `robots.txt` und `noindex` bleiben drin, weil Inhalte aus dem Schulbuch stammen.
- **Keine Bilder unklarer Herkunft veröffentlichen.** `assets/westminster.jpg` ist deshalb nicht im Repository.
- Wenn etwas unklar ist: die Eltern fragen, nicht selbst entscheiden.

## Lokal starten

Ohne KI-Erklärungen (reicht für alles andere):

```bash
python3 -m http.server 8000
```

Dann http://localhost:8000 öffnen.

Mit KI-Erklärungen (macOS mit Apple Intelligence): `Lernstudio starten.command` doppelklicken.

## Änderungen veröffentlichen

Alles, was auf `main` hochgeladen wird, ist nach etwa einer Minute online (GitHub Pages).
