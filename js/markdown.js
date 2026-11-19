// =====================================================================
// Kleiner Markdown-Leser für die Regel-Seiten (ohne Bibliothek).
//
// Unterstützt:
//   # Überschrift / ## Abschnitt {#anker} / ### Unterabschnitt {#anker}
//   Absätze, **fett**, *kursiv*, ==markiert==, `code`
//   - Listen   1. nummerierte Listen
//   | Tabellen | mit | Kopfzeile |   (zweite Zeile: |---|---|)
//   > [!WATCHOUT] Titel      -> roter "Watch out!"-Kasten
//   > [!TIP] Titel           -> gelber Tipp-Kasten
//   > [!EXAMPLE] Titel       -> blauer Beispiel-Kasten
//   > [!SUMMARY] Titel       -> grüner Zusammenfassungs-Kasten
//   ---  (Trennlinie)
//   ✗ / ✓ in Listen werden rot / grün eingefärbt.
// =====================================================================

import { inline, escapeHtml } from './util.js';

const CALLOUT_ICONS = { watchout: '⚠️', tip: '💡', example: '📝', summary: '✅' };

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[c]))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function splitRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
}

function listItem(text) {
  const html = inline(text)
    .replace(/✗/g, '<span class="wrong-ex" aria-label="wrong">✗</span>')
    .replace(/✓/g, '<span class="right-ex" aria-label="right">✓</span>');
  return `<li>${html}</li>`;
}

/**
 * Wandelt Markdown in HTML um.
 * @returns {{ html: string, headings: {level:number, text:string, id:string}[] }}
 */
export function renderMarkdown(md) {
  const lines = String(md ?? '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  const headings = [];
  let i = 0;

  const isBlank = (l) => l.trim() === '';

  while (i < lines.length) {
    const line = lines[i];

    if (isBlank(line)) { i++; continue; }

    // Überschrift
    let m = /^(#{1,4})\s+(.*?)(?:\s+\{#([\w-]+)\})?\s*$/.exec(line);
    if (m) {
      const level = m[1].length;
      const text = m[2];
      const id = m[3] || slugify(text);
      headings.push({ level, text, id });
      out.push(`<h${level} id="${escapeHtml(id)}">${inline(text)}</h${level}>`);
      i++;
      continue;
    }

    // Trennlinie
    if (/^\s*---+\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

    // Kasten / Zitat
    if (/^\s*>/.test(line)) {
      const block = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        block.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      const head = /^\[!(\w+)\]\s*(.*)$/.exec(block[0] || '');
      if (head) {
        const type = head[1].toLowerCase();
        const title = head[2] || { watchout: 'Watch out!', tip: 'Tipp', example: 'Beispiel', summary: 'In short' }[type] || '';
        const inner = renderMarkdown(block.slice(1).join('\n')).html;
        out.push(
          `<aside class="callout callout-${escapeHtml(type)}" role="note">` +
            `<p class="callout-title"><span aria-hidden="true">${CALLOUT_ICONS[type] || 'ℹ️'}</span> ${inline(title)}</p>` +
            `${inner}</aside>`,
        );
      } else {
        out.push(`<blockquote>${renderMarkdown(block.join('\n')).html}</blockquote>`);
      }
      continue;
    }

    // Tabelle
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const header = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      let html = '<div class="table-wrap"><table class="responsive"><thead><tr>';
      html += header.map((h) => `<th scope="col">${inline(h)}</th>`).join('');
      html += '</tr></thead><tbody>';
      for (const r of rows) {
        html += '<tr>' + header.map((h, k) => `<td data-label="${escapeHtml(h.replace(/[*=`]/g, ''))}">${inline(r[k] ?? '')}</td>`).join('') + '</tr>';
      }
      html += '</tbody></table></div>';
      out.push(html);
      continue;
    }

    // Liste
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      out.push('<ul>' + items.map(listItem).join('') + '</ul>');
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      out.push('<ol>' + items.map(listItem).join('') + '</ol>');
      continue;
    }

    // Absatz
    const para = [];
    while (
      i < lines.length &&
      !isBlank(lines[i]) &&
      !/^(#{1,4})\s/.test(lines[i]) &&
      !/^\s*>/.test(lines[i]) &&
      !/^\s*\|/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*---+\s*$/.test(lines[i])
    ) {
      para.push(lines[i].trim());
      i++;
    }
    // Zeilenumbruch mit zwei Leerzeichen oder "\" am Ende -> <br>
    out.push('<p>' + para.map((p) => inline(p.replace(/\\$/, ''))).join('<br>') + '</p>');
  }

  return { html: out.join('\n'), headings };
}
