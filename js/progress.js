// =====================================================================
// Fortschritt (nur für diese Sitzung) und Fortschrittscode
//
// Jede Aufgabe ("item") hat eine Nummer ("id"), die innerhalb eines Themas
// eindeutig ist. Der Code speichert für jede Nummer ein Bit:
// 1 = richtig gelöst (ohne vorher die Lösung anzusehen).
//
// Aufbau des Codes:  <Präfix>-<Version><Bits …><Prüfzeichen ×2>
// in Vierergruppen, z. B. RS-1G7Q-M2XA-9B
// Alphabet: Crockford-Base32 (ohne I, L, O, U – Verwechslungsgefahr).
// Keine Namen, keine eingegebenen Texte – nur "gelöst / nicht gelöst".
// =====================================================================

import { session } from './util.js';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const VERSION = '1';

const storeKey = (topicId) => `ek8:progress:${topicId}`;

const listeners = new Set();
export function onProgressChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify(topicId) {
  for (const fn of listeners) fn(topicId);
}

export function getSolved(topicId) {
  return new Set(session.get(storeKey(topicId), []));
}

function saveSolved(topicId, set) {
  session.set(storeKey(topicId), [...set].sort((a, b) => a - b));
  notify(topicId);
}

export function markSolved(topicId, itemId) {
  const solved = getSolved(topicId);
  if (!solved.has(itemId)) {
    solved.add(itemId);
    saveSolved(topicId, solved);
  }
}

export function isSolved(topicId, itemId) {
  return getSolved(topicId).has(itemId);
}

export function countSolved(topicId, items) {
  const solved = getSolved(topicId);
  return items.filter((it) => solved.has(it.id)).length;
}

function checksum(str) {
  let sum = 0;
  for (let i = 0; i < str.length; i++) sum = (sum * 31 + str.charCodeAt(i) * (i + 7)) % 1021;
  return ALPHABET[Math.floor(sum / 32) % 32] + ALPHABET[sum % 32];
}

function group(str) {
  return str.match(/.{1,4}/g).join('-');
}

/** Erzeugt den Fortschrittscode für ein Thema. */
export function encodeProgress(topic) {
  const solved = getSolved(topic.id);
  const max = Math.max(0, ...solved);
  const bits = [];
  for (let id = 1; id <= max; id++) bits.push(solved.has(id) ? 1 : 0);
  while (bits.length % 5) bits.push(0);
  let payload = VERSION;
  for (let i = 0; i < bits.length; i += 5) {
    const v = (bits[i] << 4) | (bits[i + 1] << 3) | (bits[i + 2] << 2) | (bits[i + 3] << 1) | bits[i + 4];
    payload += ALPHABET[v];
  }
  const prefix = topic.codePrefix || topic.id.slice(0, 2).toUpperCase();
  return `${prefix}-${group(payload + checksum(prefix + payload))}`;
}

/**
 * Liest einen Code. Gibt { ok: true, ids: Set } oder { ok: false, error } zurück.
 * Nummern, die es (nicht mehr) gibt, werden ignoriert.
 */
export function decodeProgress(topic, code) {
  const prefix = (topic.codePrefix || topic.id.slice(0, 2)).toUpperCase();
  let s = String(code || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (s.startsWith(prefix)) s = s.slice(prefix.length);
  else return { ok: false, error: `This code doesn't belong to this topic (it should start with ${prefix}).` };
  s = s.replace(/O/g, '0').replace(/[IL]/g, '1');
  if (s.length < 3) return { ok: false, error: 'This code is too short. Please check it.' };
  const payload = s.slice(0, -2);
  const check = s.slice(-2);
  if (checksum(prefix + payload) !== check) {
    return { ok: false, error: 'This code is not valid. Maybe there is a typo?' };
  }
  if (payload[0] !== VERSION) return { ok: false, error: 'Unknown code version.' };
  const ids = new Set();
  for (let k = 1; k < payload.length; k++) {
    const v = ALPHABET.indexOf(payload[k]);
    if (v < 0) return { ok: false, error: 'This code contains an invalid character.' };
    for (let b = 0; b < 5; b++) {
      if (v & (1 << (4 - b))) ids.add((k - 1) * 5 + b + 1);
    }
  }
  return { ok: true, ids };
}

/** Code übernehmen: gelöste Aufgaben werden zur aktuellen Sitzung hinzugefügt. */
export function loadProgress(topic, code) {
  const result = decodeProgress(topic, code);
  if (!result.ok) return result;
  const validIds = new Set(topic.sets.flatMap((s) => s.items.map((it) => it.id)));
  const solved = getSolved(topic.id);
  let added = 0;
  for (const id of result.ids) {
    if (validIds.has(id) && !solved.has(id)) {
      solved.add(id);
      added++;
    }
  }
  saveSolved(topic.id, solved);
  return { ok: true, added, total: solved.size };
}

export function resetProgress(topicId) {
  saveSolved(topicId, new Set());
}
