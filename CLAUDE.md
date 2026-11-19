# CLAUDE.md – Konventionen für dieses Projekt

Übungs-Website Englisch, Klasse 8, Gymnasium Baden-Württemberg. Statische Seite auf GitHub Pages.
Der Lehrer erweitert sie laufend um neue Grammatik- und Wortschatzthemen. **Erweiterbarkeit und Einfachheit gehen vor Raffinesse.**

## Technik

- HTML, CSS, Vanilla-JavaScript mit ES-Modulen. **Kein Build-Schritt, keine npm-Pakete, keine Frameworks.**
- Keine externen Ressourcen: keine CDNs, keine Google Fonts, keine Analytics, keine Cookies, kein localStorage für Lernstände.
  Nur `sessionStorage` (Fortschritt im Tab, Entwürfe offener Aufgaben). System-Schriften.
- Navigation über Hash-Routing (`#/t/<thema>/x/<set-id>`), damit GitHub Pages ohne 404-Tricks funktioniert.
- Deployment: `.github/workflows/deploy.yml` führt bei jedem Push auf `main` zuerst `tools/validate_content.py` aus und veröffentlicht dann. Kein Fehler → online.
- Lokale Werkzeuge (Windows-Rechner des Lehrers): `git`, `gh`, `python3` laufen in **WSL (Ubuntu)**. Repo liegt in `~/repos/englisch-klasse8`.
  Lokal testen: `python3 -m http.server 8000`, dann `http://localhost:8000` und `http://localhost:8000/tools/selftest.html`.

## Ordnerstruktur

```
content/topics.json                    Registry aller Themen (Reihenfolge = Startseite)
content/<thema>/topic.json             id, title, description, codePrefix, rules, subtopics[{id,title,description,sets[]}]
content/<thema>/rules.md               Regel-Seite (Markdown-Untermenge, siehe js/markdown.js)
content/<thema>/exercises/<set>.json   ein Übungsset; "id" == Dateiname
js/app.js                              Seiten und Routing
js/exercise-runner.js                  Rahmen einer Aufgabe (Check/Hint/Solution/Try again, Fortschritt)
js/exercise-types/<typ>.js             ein Modul pro Aufgabentyp; Dateiname == id == "type" im JSON
js/exercise-types/index.js             Liste der Typen (neuer Typ: import + Eintrag)
js/answers.js                          tolerante Antwortprüfung + Lösungsmuster
js/progress.js                         sessionStorage + Fortschrittscode
tools/validate_content.py              Prüfskript (nur Python-Standardbibliothek)
tools/selftest.html/.js                Browser-Selbsttest aller Aufgaben
docs/aufgabentypen.md                  JSON-Format jedes Typs mit Beispiel
materialien/                           Unterrichtsmaterial – in .gitignore, NIE committen, NIE zitieren
```

**Neues Thema** = neuer Ordner unter `content/` + Eintrag in `content/topics.json`. Kein Code ändern.
**Neuer Aufgabentyp** = neue Datei in `js/exercise-types/` + Eintrag in `index.js` + Prüfung in `validate_content.py` (`check_item`) + Test in `selftest.js` (`testItem`) + Doku in `docs/aufgabentypen.md`. Bestehende Typen nicht anfassen.

## Inhaltsformate

Formate aller Typen: `docs/aufgabentypen.md`. Wichtigste Punkte:

- Typen: `gapfill`, `multiple-choice`, `transform`, `match`, `word-order`, `error-correction`, `open-text`.
- Set-Felder: `id`, `title`, `type`, `level` (1–3), `instructions`, optional `rulesRef` (Anker `{#…}` in rules.md), `hint`, `context` (Zeilenliste), `contextTitle`, `shuffle`, `display`, `promptLabel`.
- **Item-`id`: ganze Zahl, im ganzen Thema eindeutig, nie ändern, nie wiederverwenden, Items nicht löschen** (stattdessen `"hidden": true`).
  Grund: Der Fortschrittscode ist ein Bitfeld über die Item-Nummern. Die nächste freie Nummer gibt das Prüfskript aus.
- `codePrefix` pro Thema eindeutig, 2–4 Zeichen `[A-Z0-9]`.
- Lösungsmuster: `(optional)`, `[alt1|alt2]`, verschachtelbar; Liste für ganz verschiedene Lösungen. Die **erste** Variante ist die angezeigte Musterlösung.
  Automatisch toleriert (nicht extra aufschreiben): Satzanfang-Großschreibung, Leerzeichen, Kommas, Satzzeichen/Anführungszeichen am Rand, Apostroph-Varianten, Kurz-/Langformen, BE/AE-Schreibung (Liste in `js/answers.js`).
  Was **nicht** automatisch toleriert wird und deshalb als Alternative in die Lösung gehört: `that` weglassen → `(that)`; `if/whether`; `told me/said to me`; `the next day/the following day`; `the day before/the previous day`; Namen vs. Pronomen.
- Bei `transform` mit `start`: Die erste Lösungsvariante muss mit `start` beginnen (Selbsttest prüft das).
- Bei `error-correction`: höchstens ein Fehler pro Satz; `errors` = Wörter, die als Fehlerstelle zählen; fehlerfreie Sätze mit `"errors": []`.
- Nach jeder Inhaltsänderung: `python3 tools/validate_content.py` und `tools/selftest.html` laufen lassen.

## Sprache und Didaktik

- **Oberfläche (Buttons, Anweisungen, Hinweise, Checklisten): Englisch**, einfach, Niveau A2+/B1.
- **Regel-Erklärungen (rules.md): Deutsch**, Fachbegriffe und Beispielsätze **Englisch** – wie im Unterrichtsmaterial.
- Fachbegriffe aus dem Unterricht verwenden: *direct speech / reported speech*, *Begleitsatz*, *einleitendes Verb*, *backshift of tenses* (Zeitverschiebung), *personal pronouns*, *possessive determiners*, *yes/no question* (Entscheidungsfrage), *question word*, *request* (Bitte), *command* (Aufforderung), Zeitformen wie *simple present, present progressive, simple past, present perfect, past perfect, will-future, going to-future*.
- Reihenfolge innerhalb eines Themas wie im Unterricht. Reported Speech: Statements → Questions → Requests and commands → Mixed.
- Niveau Klasse 8 BW (GER etwa A2+/B1): Wortschatz rund um Schule, Familie, Freunde, Freizeit, Austausch in den USA/GB. Kurze Sätze.
- Schreibung: Britisches Englisch als Standard (*mum, practise, colour*); amerikanische Formen werden automatisch akzeptiert. Figuren in den USA dürfen *soccer*, *mom* usw. sagen.
- Inhaltliche Festlegungen Reported Speech:
  - In den Übungen wird **immer zurückverschoben** (backshift); die Regel „kein backshift, wenn noch gültig“ wird erklärt, aber nicht abgefragt.
  - *must* → **had to** (nicht *must*). *may* → **might** (bei Erlaubnis zusätzlich *could* akzeptieren).
  - Bitten mit *please* → **ask**, Aufforderungen → **tell**.
  - Zeit- und Ortsangaben: die Situation in der Anweisung festlegen (wer berichtet wann wo), damit die Lösung eindeutig ist.
- Jede Aufgabe hat einen kurzen `hint`, der die Regel nennt, ohne die Lösung zu verraten.
- Offene Aufgaben: Checkliste (Englisch, „I …“-Sätze) + Musterlösung.

## Urheberrecht und Datenschutz (wichtig – die Seite ist öffentlich)

- **Nichts aus Lehrbüchern oder Verlagsmaterial wörtlich übernehmen**: keine Regeltexte, Beispielsätze, Dialoge, Übungen, Figuren-, Schul- oder Ortsnamen aus dem Lehrwerk (z. B. nicht die Figuren aus den Materialien im Ordner `materialien/`).
  Regeln neu formulieren, eigene Beispiele und Übungen schreiben, die sich an Inhalt und Niveau orientieren.
- `materialien/` bleibt in `.gitignore` und wird nie committet.
- **Keine Namen von Schülerinnen und Schülern.** Erfundene Figuren der App: Mila (Austauschschülerin aus Ulm, an der Lakeview High School in den USA), Familie Moreno (Mrs Moreno, Mr Moreno, Sofia 14, Diego 16), Aisha, Tyler, Jonas (Milas Freund in Ulm), Mr Okafor (Counselor), Ms Kim (Science), Mrs Patel (Bibliothek), Coach Brooks. Für neue Themen dürfen weitere erfundene Figuren dazukommen.
- Keine personenbezogenen Daten erheben, kein Login, keine externen Dienste.

## Git

- Arbeiten in WSL: `cd ~/repos/englisch-klasse8`.
- Push auf `main` veröffentlicht automatisch. Vor dem Push: Prüfskript + Selbsttest.
