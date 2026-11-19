// Kleine Hilfsfunktionen, die von mehreren Modulen genutzt werden.

/** Element erzeugen: el('p', { class: 'x', text: 'Hallo' }, [kinder]) */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, String(value));
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Inline-Formatierung für kurze Texte (Anweisungen, Hinweise, Regeln):
 * **fett**, *kursiv*, ==markiert==, `code`
 */
export function inline(str) {
  let s = escapeHtml(str ?? '');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?=[^*\w]|$)/g, '$1<em>$2</em>');
  s = s.replace(/==([^=]+)==/g, '<mark>$1</mark>');
  return s;
}

/** Ein Element mit Inline-formatiertem Inhalt */
export function inlineEl(tag, text, attrs = {}) {
  return el(tag, { ...attrs, html: inline(text) });
}

/** Zufällige Reihenfolge (Fisher-Yates), gibt neue Liste zurück */
export function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Mischt so lange, bis die Reihenfolge nicht mehr der ursprünglichen entspricht (falls möglich). */
export function shuffleDifferent(list) {
  if (list.length < 2) return list.slice();
  for (let i = 0; i < 8; i++) {
    const s = shuffle(list);
    if (s.some((x, k) => x !== list[k])) return s;
  }
  return list.slice().reverse();
}

let uid = 0;
export function uniqueId(prefix = 'id') {
  uid += 1;
  return `${prefix}-${uid}`;
}

/** Dialog-/Textzeilen darstellen: "Name: Text" wird mit fettem Sprecher dargestellt. */
export function renderLines(lines) {
  const frag = document.createDocumentFragment();
  for (const line of [].concat(lines || [])) {
    const m = /^([A-Z][A-Za-z .'’-]{0,30}):\s+(.*)$/.exec(line);
    if (m) {
      frag.append(el('p', {}, [el('span', { class: 'speaker', text: m[1] + ':' }), ' ', inlineEl('span', m[2])]));
    } else if (line.trim() === '') {
      frag.append(el('p', { 'aria-hidden': 'true', html: '&nbsp;' }));
    } else {
      frag.append(inlineEl('p', line));
    }
  }
  return frag;
}

/** sessionStorage sicher lesen/schreiben (kann im privaten Modus fehlen) */
export const session = {
  get(key, fallback = null) {
    try {
      const raw = window.sessionStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignorieren */
    }
  },
  remove(key) {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      /* ignorieren */
    }
  },
};

/** Text in die Zwischenablage kopieren, mit Rückfall für ältere Browser */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = el('textarea', { style: 'position:fixed;left:-9999px;top:0', readonly: true });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

export function stars(level) {
  const n = Math.max(1, Math.min(3, Number(level) || 1));
  return '★'.repeat(n) + '☆'.repeat(3 - n);
}

export const LEVEL_NAMES = { 1: 'Basic', 2: 'Intermediate', 3: 'Advanced' };
