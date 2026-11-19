// =====================================================================
// Tolerante Antwortprüfung
//
// Schreibweise für Lösungen in den Inhaltsdateien:
//   (that)            -> optional: mit oder ohne "that"
//   [if|whether]      -> Alternativen
//   [told me|said to me]
//   Verschachteln geht: "[he|she] said (that) [he|she] was (very) tired"
//   Ein \( oder \[ steht für das Zeichen selbst.
//
// Beim Vergleich wird automatisch toleriert:
//   - Groß-/Kleinschreibung am Satzanfang (bei Lücken: überall)
//   - mehrfache Leerzeichen, Leerzeichen vor Satzzeichen
//   - verschiedene Apostrophe (' ’ ʼ ‘ `) und Anführungszeichen
//   - Satzzeichen und Anführungszeichen am Anfang/Ende, Kommas
//   - Kurz- und Langformen (didn't = did not, he'd = he had / he would …)
//   - britische / amerikanische Schreibung (mum/mom, colour/color …)
//   - Mr/Mr., Mrs/Mrs., Ms/Ms.
// =====================================================================

const MAX_VARIANTS = 4000;

/** Zerlegt ein Muster in alle ausgeschriebenen Varianten. */
export function expandPattern(pattern) {
  const src = String(pattern ?? '');
  let pos = 0;

  // Sequenz bis zu einem der Stoppzeichen lesen
  function parseSeq(stops) {
    let results = [''];
    let literal = '';
    const flush = () => {
      if (literal) {
        results = results.map((r) => r + literal);
        literal = '';
      }
    };
    while (pos < src.length) {
      const ch = src[pos];
      if (ch === '\\' && pos + 1 < src.length) {
        literal += src[pos + 1];
        pos += 2;
        continue;
      }
      if (stops.includes(ch)) break;
      if (ch === '(') {
        pos++;
        flush();
        const inner = parseAlternatives(')');
        pos++; // ')'
        results = combine(results, [...inner, '']);
        continue;
      }
      if (ch === '[') {
        pos++;
        flush();
        const inner = parseAlternatives(']');
        pos++; // ']'
        results = combine(results, inner);
        continue;
      }
      literal += ch;
      pos++;
    }
    flush();
    return results;
  }

  function parseAlternatives(close) {
    const alts = [];
    for (;;) {
      alts.push(...parseSeq(['|', close]));
      if (src[pos] === '|') {
        pos++;
        continue;
      }
      break;
    }
    return alts;
  }

  function combine(a, b) {
    const out = [];
    for (const x of a) {
      for (const y of b) {
        out.push(x + y);
        if (out.length > MAX_VARIANTS) return out;
      }
    }
    return out;
  }

  // Oberste Ebene: auch "a|b" ohne Klammern erlaubt
  const all = parseAlternatives('\u0000');
  // Leerzeichen säubern, Duplikate entfernen
  const clean = all.map((v) => v.replace(/\s+/g, ' ').replace(/\s+([,.!?;:])/g, '$1').trim());
  return [...new Set(clean)];
}

/** Prüft, ob Klammern in einem Muster zusammenpassen. Gibt Fehlermeldung oder null zurück. */
export function patternError(pattern) {
  const stack = [];
  const src = String(pattern ?? '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '\\') { i++; continue; }
    if (ch === '(' || ch === '[') stack.push(ch);
    if (ch === ')' || ch === ']') {
      const open = stack.pop();
      if ((ch === ')' && open !== '(') || (ch === ']' && open !== '[')) return `Klammer passt nicht: "${src}"`;
    }
  }
  return stack.length ? `Klammer nicht geschlossen: "${src}"` : null;
}

// ---------------------------------------------------------------------
// Normalisierung
// ---------------------------------------------------------------------

// Britisch/amerikanisch -> eine gemeinsame Form
const SPELLING = {
  mom: 'mum', moms: 'mums', mommy: 'mummy',
  color: 'colour', colors: 'colours', colorful: 'colourful',
  favorite: 'favourite', favorites: 'favourites',
  center: 'centre', centers: 'centres',
  theater: 'theatre', theaters: 'theatres',
  neighbor: 'neighbour', neighbors: 'neighbours', neighborhood: 'neighbourhood',
  behavior: 'behaviour', humor: 'humour', honor: 'honour', flavor: 'flavour',
  practice: 'practise', practices: 'practises', practiced: 'practised', practicing: 'practising',
  gray: 'grey', math: 'maths',
  traveled: 'travelled', traveling: 'travelling', traveler: 'traveller', travelers: 'travellers',
  canceled: 'cancelled', canceling: 'cancelling',
  organize: 'organise', organized: 'organised', organizing: 'organising',
  realize: 'realise', realized: 'realised', realizing: 'realising',
  apologize: 'apologise', apologized: 'apologised',
  recognize: 'recognise', recognized: 'recognised',
  cozy: 'cosy', pajamas: 'pyjamas', catalog: 'catalogue', dialog: 'dialogue',
  jewelry: 'jewellery', program: 'programme', programs: 'programmes',
  'mr.': 'mr', 'mrs.': 'mrs', 'ms.': 'ms', 'dr.': 'dr',
  okay: 'ok', 'o.k.': 'ok',
};

// Nach diesen Wörtern steht 's für "is" oder "has" (sonst: Genitiv-s)
const S_IS_HAS = new Set([
  'he', 'she', 'it', 'that', 'there', 'here', 'what', 'who', 'where', 'when', 'why', 'how', 'this', 'everything', 'nothing', 'something', 'everybody', 'nobody', 'somebody', 'everyone', 'someone',
]);

function keepCase(original, replacement) {
  if (original && original[0] !== original[0].toLowerCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

/** Ein Wort -> Liste möglicher Langformen (meist nur eine) */
function expandToken(token) {
  const lower = token.toLowerCase();
  const special = { "won't": 'will not', "can't": 'can not', cannot: 'can not', "shan't": 'shall not', "ain't": 'is not' };
  if (special[lower]) return [keepCase(token, special[lower])];
  let m;
  if ((m = /^(.+)n't$/i.exec(token))) return [`${m[1]} not`];
  if ((m = /^(.+)'m$/i.exec(token))) return [`${m[1]} am`];
  if ((m = /^(.+)'re$/i.exec(token))) return [`${m[1]} are`];
  if ((m = /^(.+)'ve$/i.exec(token))) return [`${m[1]} have`];
  if ((m = /^(.+)'ll$/i.exec(token))) return [`${m[1]} will`];
  if ((m = /^(.+)'d$/i.exec(token))) return [`${m[1]} had`, `${m[1]} would`];
  if ((m = /^(.+)'s$/i.exec(token)) && S_IS_HAS.has(m[1].toLowerCase())) return [`${m[1]} is`, `${m[1]} has`, token];
  const spelled = SPELLING[lower];
  if (spelled) return [keepCase(token, spelled)];
  return [token];
}

/**
 * Antwort -> Liste normalisierter Kandidaten.
 * options.ignoreCase: alles klein (für Lücken)
 */
export function normalize(text, options = {}) {
  let s = String(text ?? '').normalize('NFC');
  s = s.replace(/[’‘ʼ`´]/g, "'").replace(/[“”„«»]/g, '"');
  s = s.replace(/ /g, ' ');
  s = s.trim();
  // Satzzeichen/Anführungszeichen am Anfang und Ende entfernen
  s = s.replace(/^["'\s]+/, '').replace(/[\s.!?;:,"'…]+$/, '');
  // Kommas sind für die Bewertung egal
  s = s.replace(/,/g, ' ');
  // Leerzeichen vor Satzzeichen, mehrfache Leerzeichen
  s = s.replace(/\s+([.!?;:])/g, '$1').replace(/\s+/g, ' ').trim();
  if (options.ignoreCase) s = s.toLowerCase();
  else if (s) s = s[0].toLowerCase() + s.slice(1); // Satzanfang

  const tokens = s.split(' ').filter(Boolean);
  let candidates = [''];
  for (const tok of tokens) {
    const forms = expandToken(tok);
    const next = [];
    for (const c of candidates) {
      for (const f of forms) {
        next.push(c ? `${c} ${f}` : f);
        if (next.length > 256) break;
      }
    }
    candidates = next;
  }
  // Nach dem Auflösen nochmal Satzanfang angleichen ("I'm" -> "i am" …)
  return [...new Set(candidates.map((c) => (options.ignoreCase ? c.toLowerCase() : c ? c[0].toLowerCase() + c.slice(1) : c)))];
}

// Zwischenspeicher für ausgeschriebene Lösungen
const cache = new Map();

function expectedSet(patterns, options) {
  const key = JSON.stringify([patterns, !!options.ignoreCase]);
  if (cache.has(key)) return cache.get(key);
  const set = new Set();
  for (const p of [].concat(patterns)) {
    for (const variant of expandPattern(p)) {
      for (const n of normalize(variant, options)) set.add(n);
    }
  }
  cache.set(key, set);
  return set;
}

/**
 * Ist die Antwort richtig?
 * @param {string} given      Eingabe der Schülerin / des Schülers
 * @param {string|string[]} patterns  Lösung(en) im Musterformat
 * @param {{ignoreCase?: boolean}} options
 */
export function isCorrect(given, patterns, options = {}) {
  if (!String(given ?? '').trim()) return false;
  const expected = expectedSet(patterns, options);
  return normalize(given, options).some((c) => expected.has(c));
}

/** Erste ausgeschriebene Variante (als Musterlösung zum Anzeigen) */
export function firstSolution(patterns) {
  const first = [].concat(patterns)[0];
  return expandPattern(first)[0] ?? '';
}

/** Mehrere Varianten zum Anzeigen ("Also correct: …") */
export function solutionVariants(patterns, limit = 4) {
  const out = [];
  for (const p of [].concat(patterns)) {
    for (const v of expandPattern(p)) {
      if (!out.includes(v)) out.push(v);
      if (out.length >= limit + 1) return out;
    }
  }
  return out;
}
