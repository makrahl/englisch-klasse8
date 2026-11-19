# Aufgabentypen und ihr JSON-Format

Jedes Übungsset ist eine JSON-Datei in `content/<thema>/exercises/`. Alle Aufgaben eines Sets haben **denselben Typ**.

## Felder für jedes Übungsset

| Feld | Pflicht? | Bedeutung |
|---|---|---|
| `id` | ja | gleich wie der Dateiname ohne `.json` |
| `title` | ja | Überschrift (Englisch) |
| `type` | ja | Aufgabentyp, siehe unten |
| `level` | ja | 1 = Basic, 2 = Intermediate, 3 = Advanced |
| `instructions` | empfohlen | Arbeitsanweisung (Englisch, einfach) |
| `rulesRef` | nein | Anker eines Regel-Abschnitts, z. B. `"backshift"` |
| `hint` | nein | Hinweis für alle Aufgaben, die keinen eigenen haben |
| `context` | nein | Text über allen Aufgaben, als Liste von Zeilen. `"Name: Text"` macht den Namen fett (für Dialoge). |
| `contextTitle` | nein | Überschrift über dem `context` |
| `items` | ja | Liste der Aufgaben |

## Felder für jede Aufgabe

| Feld | Pflicht? | Bedeutung |
|---|---|---|
| `id` | ja | ganze Zahl, im ganzen Thema eindeutig, nie ändern (Fortschrittscode!) |
| `hint` | nein | Hinweis, der per Knopf „Hint“ erscheint |
| `hidden` | nein | `true` blendet die Aufgabe aus (statt sie zu löschen) |

In allen Texten gehen `**fett**`, `*kursiv*` und `==markiert==`. Ein Anführungszeichen im Text schreibst du als `\"`.

---

## gapfill – Lückentext

Lücken stehen in `{{ }}`. Alternativen mit `|` trennen. Groß-/Kleinschreibung ist in Lücken egal.

```json
{
  "id": "st-verbs-gapfill",
  "title": "Backshift: put in the verb",
  "type": "gapfill",
  "level": 1,
  "instructions": "Write the verb form in the gap.",
  "items": [
    {
      "id": 4,
      "direct": "Sofia: \"I like horror films.\"",
      "text": "Sofia said that she {{liked}} horror films.",
      "hint": "simple present → simple past"
    },
    {
      "id": 36,
      "direct": "Diego: \"I'm going to the gym tomorrow.\"",
      "text": "Diego said that he was going to the gym {{the next day|the following day}}."
    }
  ]
}
```

- `direct` (optional): Satz in direkter Rede, wird darüber angezeigt.
- Mehrere Lücken pro Satz sind möglich.
- Set-Option `"display": "text"` zusammen mit `context` eignet sich für einen Bericht über einen Dialog.

## multiple-choice – Auswahl

```json
{
  "id": 14,
  "direct": "Mila: \"I'm homesick.\"",
  "question": "Mila ___ me that she was homesick.",
  "options": ["said", "told", "asked"],
  "answer": "told",
  "hint": "tell + Person"
}
```

- `answer` muss **genau** so geschrieben sein wie eine der `options`.
- Set-Option `"shuffle": true` mischt die Antworten bei jedem Aufruf.

## transform – Satzumformung

Die Kinder schreiben den ganzen Satz.

```json
{
  "id": 52,
  "direct": "Mila: \"I'm hungry.\"",
  "start": "Mila said",
  "answer": "Mila said (that) she was hungry.",
  "hint": "I → she, am → was"
}
```

- `start` (optional): steht schon im Eingabefeld. Die Lösung muss mit diesem Text beginnen.
- `answer`: ein Lösungsmuster oder eine Liste davon (siehe README, Abschnitt 5).
- Set-Option `"promptLabel": "reported"` beschriftet den Ausgangssatz mit „Reported speech“ (für die Rückumformung in die direkte Rede), `"none"` lässt die Beschriftung weg.

## match – Zuordnung

Bedienung: Feld antippen und Karte auswählen, Karte antippen und Feld antippen, oder Karte ins Feld ziehen. Alles geht auch mit der Tastatur.

```json
{
  "id": 1,
  "prompt": "Tenses (part 1)",
  "pairs": [
    ["simple present", "simple past"],
    ["simple past", "past perfect"],
    ["present perfect", "past perfect"],
    ["will", "would"]
  ]
}
```

- Jede linke Seite darf nur einmal vorkommen. Rechte Seiten dürfen sich wiederholen.
- 4–6 Paare pro Aufgabe passen gut auf das Handy.

## word-order – Satzbau

Die Wörter werden aus der ersten Lösung gebildet und gemischt.

```json
{
  "id": 94,
  "direct": "Mila: \"Where is the cafeteria?\"",
  "answer": "Mila asked where the cafeteria was.",
  "distractors": ["is"]
}
```

- `distractors` (optional): zusätzliche Wörter, die **nicht** in den Satz gehören.
- `answer` darf eine Liste sein (z. B. mit *if* und *whether*). Die Wörter kommen aber nur aus der ersten Lösung.
- Das Satzzeichen am Ende wird automatisch angehängt.

## error-correction – Fehler finden

Pro Satz **höchstens ein** Fehler. Die Kinder tippen das falsche Wort an und schreiben den Satz richtig.

```json
{
  "id": 68,
  "sentence": "Sofia said me that she was tired.",
  "errors": ["said", "me"],
  "answer": ["Sofia told me (that) she was tired.", "Sofia said to me (that) she was tired."],
  "hint": "say or tell?"
}
```

- `errors`: Wörter, die als Fehlerstelle zählen. Es reicht, eines davon anzutippen.
- Ein Satz **ohne** Fehler: `"errors": []` und kein `answer`. Dann ist „No mistake“ richtig.

## open-text – Schreibaufgabe mit Erwartungshorizont

Wird nicht automatisch bewertet. Die Kinder prüfen ihren Text selbst mit der Checkliste und vergleichen dann mit der Musterlösung.

```json
{
  "id": 76,
  "sourceTitle": "Mila at dinner",
  "source": [
    "Mila: School here is really different. …"
  ],
  "task": "Two days later, Sofia tells her friend what Mila said. Write Sofia's report.",
  "start": "Mila said that",
  "minWords": 60,
  "checklist": [
    "I backshifted the tenses.",
    "I changed the pronouns and possessive determiners.",
    "I changed the time expressions."
  ],
  "model": "Mila said that school here was really different. …\nShe told us that …",
  "hint": "…"
}
```

- `source`: Ausgangstext als Liste von Zeilen (`"Name: Text"` für Dialoge).
- `model`: Musterlösung. `\n` beginnt einen neuen Absatz.
- Die Aufgabe zählt als erledigt, wenn ein Text (mindestens etwa 20 Wörter) geschrieben und die ganze Checkliste abgehakt wurde.
- Der Entwurf bleibt im Tab gespeichert, solange der Tab offen ist.

---

## Einen neuen Aufgabentyp programmieren

Ein Aufgabentyp ist eine Datei `js/exercise-types/<name>.js`. Der Dateiname ist der Typ-Name.

```js
import { el } from '../util.js';
import { isCorrect } from '../answers.js';

export default {
  id: 'my-type',              // = Dateiname
  label: 'My type',           // wird in der Übersicht angezeigt
  // optional:
  // controls: ['check', 'hint', 'solution', 'retry'],
  // labels: { solution: 'Show expectations' },
  // solutionNeedsCheck: true,

  render(item, ctx) {
    // ctx = { set, topic, item, number, requestCheck(), markSolved() }
    const input = el('input', { type: 'text' });
    const element = el('div', {}, [input]);
    return {
      element,
      isEmpty: () => !input.value.trim(),
      check() {
        const correct = isCorrect(input.value, item.answer);
        input.classList.toggle('is-right', correct);
        input.classList.toggle('is-wrong', !correct);
        return { correct, message: null };
      },
      showSolution() { input.value = item.answer; input.classList.add('is-solution'); },
      reset() { input.value = ''; input.className = ''; },
      focus() { input.focus(); },
    };
  },
};
```

Danach:

1. In `js/exercise-types/index.js` importieren und in die Liste `list` eintragen.
2. In `tools/validate_content.py` (`check_item`) die Pflichtfelder prüfen.
3. In `tools/selftest.js` (`testItem`) einen Test „richtig/falsch“ ergänzen.

Die Knöpfe (Check, Hint, Show solution, Try again), die Rückmeldung und der Fortschritt kommen automatisch aus `js/exercise-runner.js`.
