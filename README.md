# English Practice · Klasse 8

Eine Übungs-Website für Englisch in Klasse 8 (Gymnasium, Baden-Württemberg).
Zu jedem Thema gibt es **Regeln** und **Übungen** mit sofortiger Rückmeldung.

**Zur Seite:** https://makrahl.github.io/englisch-klasse8/

- Läuft komplett im Browser – kein Server, keine Datenbank, kein Login.
- Datenschutz: keine Cookies, kein Tracking, keine externen Schriften oder CDNs. Alles liegt in diesem Repository.
- Der Fortschritt gilt nur für den aktuellen Browser-Tab. Mit dem **Fortschrittscode** können die Kinder später weitermachen.
- Oberfläche auf Englisch, Regel-Erklärungen auf Deutsch.

Erstes Thema: **Reported Speech** (Statements, Questions, Requests and commands) mit 27 Übungssets und 179 Aufgaben.

---

## Inhalt dieser Anleitung

1. [Projektstruktur](#1-projektstruktur)
2. [Neue Übung hinzufügen](#2-neue-übung-hinzufügen)
3. [Neues Übungsset hinzufügen](#3-neues-übungsset-hinzufügen)
4. [Neues Thema hinzufügen](#4-neues-thema-hinzufügen)
5. [Lösungen mit Alternativen schreiben](#5-lösungen-mit-alternativen-schreiben)
6. [Prüfen und lokal testen](#6-prüfen-und-lokal-testen)
7. [Fortschrittscode](#7-fortschrittscode)
8. [Regeln zu Urheberrecht und Datenschutz](#8-regeln-zu-urheberrecht-und-datenschutz)

Das genaue Format aller Aufgabentypen mit Beispielen steht in **[docs/aufgabentypen.md](docs/aufgabentypen.md)**.

---

## 1. Projektstruktur

```
englisch-klasse8/
├── index.html                  Startseite (nichts ändern nötig)
├── css/style.css               Aussehen
├── js/                         Programmcode (für neue Inhalte nicht nötig)
│   └── exercise-types/         ein Modul pro Aufgabentyp
├── content/                    ★ HIER LIEGEN ALLE INHALTE ★
│   ├── topics.json             Liste aller Themen (Startseite)
│   └── reported-speech/        ein Ordner pro Thema
│       ├── topic.json          Titel, Unterthemen, Reihenfolge der Übungssets
│       ├── rules.md            Regel-Seite (Markdown)
│       └── exercises/          eine Datei pro Übungsset
│           ├── st-verbs-gapfill.json
│           └── …
├── docs/aufgabentypen.md       Format aller Aufgabentypen mit Beispielen
├── tools/
│   ├── validate_content.py     Prüfskript für die Inhalte
│   └── selftest.html           automatischer Test aller Aufgaben im Browser
├── .github/workflows/deploy.yml   prüft und veröffentlicht bei jedem Push
├── CLAUDE.md                   Konventionen für Erweiterungen mit Claude Code
└── materialien/                Unterrichtsmaterial – wird NIE hochgeladen (.gitignore)
```

**Wichtig:** Für neue Inhalte musst du nur Dateien im Ordner `content/` bearbeiten.

---

## 2. Neue Übung hinzufügen

Eine „Übung“ (Aufgabe) ist ein Eintrag in einem Übungsset. Beispiel: ein weiterer Satz im Lückentext.

**Am einfachsten direkt auf github.com:**

1. Öffne das Repository auf github.com und gehe zu `content/reported-speech/exercises/`.
2. Klicke auf die Datei, z. B. `st-verbs-gapfill.json`.
3. Klicke oben rechts auf das **Stift-Symbol** („Edit this file“).
4. Kopiere eine vorhandene Aufgabe – alles von `{` bis `}` – und füge sie hinter der letzten Aufgabe ein.
   Zwischen zwei Aufgaben muss ein **Komma** stehen, nach der letzten Aufgabe **keines**:
   ```json
       {
         "id": 13,
         "direct": "Tyler: \"I don't understand the homework.\"",
         "text": "Tyler said that he {{didn't understand}} the homework.",
         "hint": "don't understand → didn't understand"
       },
       {
         "id": 180,
         "direct": "Aisha: \"I play the drums.\"",
         "text": "Aisha said that she {{played}} the drums.",
         "hint": "simple present → simple past"
       }
     ]
   }
   ```
5. Ändere den Text. Gib der Aufgabe eine **neue Nummer** bei `"id"`.
   Die nächste freie Nummer zeigt das Prüfskript an. Du kannst auch einfach die höchste Nummer im ganzen Thema nehmen und 1 dazuzählen.
6. Anführungszeichen **innerhalb** eines Textes schreibst du als `\"` (siehe Beispiel oben).
7. Unten auf **„Commit changes …“** klicken und bestätigen.
8. Nach 1–2 Minuten ist die Änderung online. Unter dem Reiter **„Actions“** siehst du, ob alles geklappt hat:
   grüner Haken ✓ = veröffentlicht, rotes ✗ = Fehler gefunden. Dann bleibt die alte Version online. Klicke auf den roten Eintrag und dann auf „Inhalte prüfen“: Dort steht, in welcher Datei und Zeile der Fehler ist.

**Regeln für die Nummern („id“):**

- Jede Nummer darf in einem Thema **nur einmal** vorkommen.
- Nummern **nie ändern oder wiederverwenden** und Aufgaben **nicht löschen**. Sonst stimmen alte Fortschrittscodes nicht mehr.
  Eine Aufgabe ausblenden geht so: `"hidden": true` in die Aufgabe schreiben.
- Neue Aufgaben möglichst **hinten** anhängen.

---

## 3. Neues Übungsset hinzufügen

1. Im Ordner `content/<thema>/exercises/` eine neue Datei anlegen, z. B. `st-reporting-verbs.json`
   (auf github.com: „Add file“ → „Create new file“). Am einfachsten eine ähnliche Datei kopieren.
2. In der Datei muss `"id"` genau wie der Dateiname heißen (ohne `.json`).
3. `"type"` legt den Aufgabentyp fest: `gapfill`, `multiple-choice`, `transform`, `match`, `word-order`, `error-correction` oder `open-text`.
   Das Format jedes Typs steht in [docs/aufgabentypen.md](docs/aufgabentypen.md).
4. `"level"`: 1 = Basic ★, 2 = Intermediate ★★, 3 = Advanced ★★★.
5. `"rulesRef"` (optional): Verweis auf einen Abschnitt der Regel-Seite, z. B. `"backshift"` – das ist der Anker `{#backshift}` in `rules.md`.
6. In `content/<thema>/topic.json` den Namen der neuen Datei in die Liste `"sets"` des passenden Unterthemas schreiben.
   Die Reihenfolge dort ist die Reihenfolge auf der Seite.

Gerüst eines Übungssets:

```json
{
  "id": "st-reporting-verbs",
  "title": "Reporting verbs",
  "type": "multiple-choice",
  "level": 2,
  "rulesRef": "statements",
  "instructions": "Choose the best reporting verb.",
  "items": [
    { "id": 180, "question": "…", "options": ["…", "…"], "answer": "…" }
  ]
}
```

---

## 4. Neues Thema hinzufügen

Ein neues Thema = **ein neuer Ordner** + **ein Eintrag in `content/topics.json`**. Am Programmcode muss nichts geändert werden.

1. Neuen Ordner anlegen, z. B. `content/if-clauses/`. Der Name besteht nur aus Kleinbuchstaben, Ziffern und Bindestrichen.
2. Darin drei Dinge anlegen (am besten aus `reported-speech` kopieren und anpassen):
   - `topic.json` – Titel, Beschreibung, Unterthemen, Liste der Übungssets
   - `rules.md` – die Regel-Seite
   - Ordner `exercises/` mit den Übungssets
3. In `topic.json`:
   - `"id"` = Ordnername
   - `"codePrefix"` = ein **neues** Kürzel aus 2–4 Großbuchstaben, z. B. `"IF"`. Es steht vorne im Fortschrittscode.
   - Die Nummern (`"id"`) der Aufgaben fangen in jedem Thema wieder bei 1 an.
4. In `content/topics.json` einen Eintrag ergänzen:
   ```json
   {
     "topics": [
       { "id": "reported-speech", "title": "Reported Speech", "icon": "💬", "description": "…" },
       { "id": "if-clauses", "title": "If-clauses", "icon": "🔀", "description": "Conditional sentences type 1, 2 and 3." }
     ]
   }
   ```
5. Prüfskript laufen lassen oder einfach committen – die GitHub Action prüft automatisch.

### Die Regel-Seite (`rules.md`)

Die Regeln werden in **Markdown** geschrieben:

| Schreibweise | Ergebnis |
|---|---|
| `## 1 Statements {#statements}` | Abschnitt mit Anker `statements` (für `rulesRef` und das Inhaltsverzeichnis) |
| `**fett**`, `*kursiv*`, `==markiert==` | **fett**, *kursiv*, gelb markiert |
| `- Punkt` | Aufzählung |
| `\| a \| b \|` + Zeile `\|---\|---\|` | Tabelle (wird auf dem Handy als Karten angezeigt) |
| `> [!WATCHOUT] Watch out!` + Zeilen mit `> - …` | roter Kasten für typische Fehler |
| `> [!TIP] Titel` / `> [!EXAMPLE] Titel` / `> [!SUMMARY] Titel` | gelber / blauer / grüner Kasten |
| `✗` und `✓` in Listen | werden rot bzw. grün |

Jede Zeile eines Absatzes wird als eigene Zeile angezeigt.

---

## 5. Lösungen mit Alternativen schreiben

Damit du nicht jede richtige Variante einzeln aufschreiben musst:

| Schreibweise | Bedeutung | Beispiel |
|---|---|---|
| `( … )` | optional | `Mila said (that) she was tired.` → mit oder ohne *that* |
| `[ … \| … ]` | Alternativen | `He asked [if\|whether] I was hungry.` |
| beides kombiniert | | `[He told me\|He said to me] (that) he was late.` |
| Liste `[ "…", "…" ]` | ganz verschiedene Lösungen | `"answer": ["Sofia told me she was tired.", "Sofia said to me she was tired."]` |

In Lücken (`{{ … }}`) trennst du Alternativen einfach mit `|`: `{{the next day|the following day}}`.

**Automatisch toleriert** werden (das musst du nicht aufschreiben):

- Groß-/Kleinschreibung am Satzanfang (in Lücken überall)
- mehrfache Leerzeichen, Kommas, Satzzeichen und Anführungszeichen am Anfang und Ende
- verschiedene Apostrophe (`'` und `’`)
- Kurz- und Langformen: *didn't = did not*, *can't = cannot = can not*, *he'd = he had / he would*, *it's = it is / it has* …
- britische und amerikanische Schreibung: *mum/mom*, *practise/practice*, *colour/color*, *Mrs/Mrs.* …

Die **erste** Variante wird den Kindern als Musterlösung gezeigt. Schreib die Variante, die du für die beste hältst, also nach vorne.

---

## 6. Prüfen und lokal testen

### Prüfskript

Das Prüfskript findet kaputtes JSON (mit Zeilennummer), fehlende Lösungen, unbekannte Aufgabentypen, doppelte Nummern und falsche Verweise.
Es läuft bei jedem Push automatisch. Lokal (Python 3 nötig, z. B. in WSL/Ubuntu):

```bash
cd ~/repos/englisch-klasse8
python3 tools/validate_content.py
```

### Seite lokal ansehen

```bash
cd ~/repos/englisch-klasse8
python3 -m http.server 8000
```

Dann im Browser öffnen: http://localhost:8000
Den **Selbsttest** öffnest du unter http://localhost:8000/tools/selftest.html. Er löst jede Aufgabe einmal richtig und einmal falsch und meldet, wenn eine Musterlösung nicht als richtig erkannt wird.

Hinweis: Nach einer Änderung kann der Browser noch die alte Version zeigen. Dann mit **Strg + Umschalt + R** neu laden. Auf GitHub Pages dauert es bis zu 10 Minuten, bis alle Browser die neue Version sehen.

---

## 7. Fortschrittscode

- Jedes Thema hat einen eigenen Code, z. B. `RS-1KG0-0000-0008-…`. Er speichert nur, **welche Aufgaben richtig gelöst** wurden. Keine Namen, keine eingegebenen Texte.
- Eine Aufgabe zählt als gelöst, wenn sie richtig beantwortet wurde, **bevor** die Lösung angezeigt wurde. Offene Schreibaufgaben zählen, wenn ein Text geschrieben und die ganze Checkliste abgehakt wurde.
- Die Kinder kopieren den Code (Button „Copy code“) oder schreiben ihn ab. Beim nächsten Mal geben sie ihn auf der Themenseite ein.
- Tippfehler werden durch Prüfzeichen erkannt. Groß-/Kleinschreibung, Leerzeichen und die Verwechslung O/0 bzw. I/l/1 sind egal.
- **Lehreransicht:** Auf der Themenseite unten „For teachers: look at a progress code“. Dort sehen Sie pro Übungsset, was mit einem Code gelöst wurde.
- Der Code ist **kein Leistungsnachweis**: Ohne Server lässt er sich nicht gegen Weitergeben oder Basteln schützen.

---

## 8. Regeln zu Urheberrecht und Datenschutz

- **Keine Texte aus Lehrbüchern oder Verlagsmaterial wörtlich übernehmen** – auch keine Namen von Figuren, Schulen oder Orten aus dem Lehrwerk. Regeln neu formulieren, eigene Beispielsätze und Übungen schreiben.
- Der Ordner `materialien/` (Fotos/Scans aus dem Unterricht) steht in `.gitignore` und wird **nie** hochgeladen.
- **Keine Namen von Schülerinnen und Schülern** in den Inhalten. Die Figuren der Übungen sind erfunden: Mila (Austauschschülerin aus Ulm), Familie Moreno (Mrs/Mr Moreno, Sofia, Diego), Aisha, Tyler, Jonas, Mr Okafor, Ms Kim, Mrs Patel, Coach Brooks.
- Keine externen Dienste einbinden: keine CDNs, keine Google Fonts, kein Tracking, keine Cookies.
- Hinweis: GitHub Pages ist ein Dienst von GitHub (USA). GitHub speichert als Anbieter technisch die IP-Adressen der Besucher. Bei Fragen dazu am besten mit der/dem Datenschutzbeauftragten der Schule sprechen.

---

## Neuen Aufgabentyp programmieren (für Fortgeschrittene)

1. Neue Datei `js/exercise-types/<name>.js` anlegen. Vorlage und Schnittstelle stehen in [docs/aufgabentypen.md](docs/aufgabentypen.md#einen-neuen-aufgabentyp-programmieren).
2. In `js/exercise-types/index.js` eine `import`-Zeile und den Eintrag in der Liste ergänzen.
3. In `tools/validate_content.py` (Funktion `check_item`) und in `tools/selftest.js` (Funktion `testItem`) Prüfungen für den neuen Typ ergänzen.

Bestehende Aufgabentypen müssen dafür nicht verändert werden.
