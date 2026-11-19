// =====================================================================
// Liste aller Aufgabentypen.
//
// Neuen Aufgabentyp hinzufügen:
//   1. Datei js/exercise-types/<typ-name>.js anlegen (Vorlage: siehe README / CLAUDE.md).
//      Der Dateiname ist gleichzeitig der Typ-Name, der in den JSON-Dateien
//      unter "type" steht.
//   2. Hier eine import-Zeile und einen Eintrag in der Liste ergänzen.
// Bestehende Typen müssen dafür nicht geändert werden.
// =====================================================================

import gapfill from './gapfill.js';
import multipleChoice from './multiple-choice.js';
import transform from './transform.js';
import match from './match.js';
import wordOrder from './word-order.js';
import errorCorrection from './error-correction.js';
import openText from './open-text.js';

const list = [gapfill, multipleChoice, transform, match, wordOrder, errorCorrection, openText];

export const exerciseTypes = Object.fromEntries(list.map((t) => [t.id, t]));

export function getType(id) {
  return exerciseTypes[id] || null;
}
