// Aufgabentyp "word-order" – Satzbau (Wörter in die richtige Reihenfolge bringen)
//
// Item-Format:
// {
//   "id": 94,
//   "direct": "Mila: \"Where is the cafeteria?\"",
//   "answer": "Mila asked where the cafeteria was.",   die Wörter werden daraus gebildet
//   "distractors": ["is"],                              (optional) zusätzliche falsche Wörter
//   "hint": "…"                                         (optional)
// }
// "answer" darf auch eine Liste sein; die Wörter stammen aus der ersten Lösung
// (ohne Satzzeichen am Ende). Weitere Lösungen werden beim Prüfen akzeptiert.

import { el, inline, shuffleDifferent } from '../util.js';
import { isCorrect, firstSolution } from '../answers.js';

export function splitWords(sentence) {
  const s = String(sentence).trim();
  const endMatch = /[.!?]+$/.exec(s);
  const end = endMatch ? endMatch[0] : '';
  const body = end ? s.slice(0, -end.length) : s;
  return { words: body.split(/\s+/).filter(Boolean), end };
}

export default {
  id: 'word-order',
  label: 'Word order',

  render(item, ctx) {
    const element = el('div', { class: 'word-order' });
    if (item.direct) element.append(el('p', { class: 'direct', html: inline(item.direct) }));

    const { words, end } = splitWords(firstSolution(item.answer));
    const tokens = [...words, ...(item.distractors || [])].map((text, id) => ({ id, text }));
    let order = shuffleDifferent(tokens.map((t) => t.id));
    let line = []; // token ids in Antwortzeile
    let locked = false;

    const lineBox = el('div', { class: 'wo-line', role: 'group', 'aria-label': 'Your sentence' });
    const endMark = el('span', { class: 'wo-end', text: end });
    const poolBox = el('div', { class: 'wo-pool', role: 'group', 'aria-label': 'Words' });
    const status = el('p', { class: 'sr-only', 'aria-live': 'polite' });
    const solutionBox = el('div', { class: 'solution-box', hidden: true });
    element.append(
      el('p', { class: 'match-help', text: 'Tap the words in the right order. Tap a word in your sentence to put it back.' }),
      lineBox,
      poolBox,
      status,
      solutionBox,
    );

    function chip(t, inLine) {
      const b = el('button', { type: 'button', class: 'chip wo-chip', text: t.text });
      b.setAttribute('aria-label', inLine ? `${t.text} – remove` : `${t.text} – add`);
      b.addEventListener('click', () => {
        if (locked) return;
        lineBox.classList.remove('is-right', 'is-wrong', 'is-solution');
        if (inLine) {
          line = line.filter((x) => x !== t.id);
          status.textContent = `Removed “${t.text}”.`;
        } else {
          line.push(t.id);
          status.textContent = `Added “${t.text}”. Your sentence: ${sentence()}`;
        }
        render();
        // Fokus sinnvoll halten
        const next = poolBox.querySelector('button') || lineBox.querySelector('button');
        next?.focus();
      });
      return b;
    }

    function sentence() {
      return line.map((id) => tokens[id].text).join(' ') + end;
    }

    function render() {
      lineBox.textContent = '';
      for (const id of line) lineBox.append(chip(tokens[id], true));
      if (line.length) lineBox.append(endMark);
      poolBox.textContent = '';
      for (const id of order) if (!line.includes(id)) poolBox.append(chip(tokens[id], false));
    }
    render();

    return {
      element,
      isEmpty: () => line.length === 0,
      check() {
        lineBox.classList.remove('is-right', 'is-wrong', 'is-solution');
        const correct = isCorrect(sentence(), item.answer);
        lineBox.classList.add(correct ? 'is-right' : 'is-wrong');
        return { correct };
      },
      showSolution() {
        const answerWords = words.slice();
        line = [];
        const free = tokens.slice();
        for (const w of answerWords) {
          const k = free.findIndex((t) => t.text === w);
          line.push(free.splice(k, 1)[0].id);
        }
        render();
        lineBox.classList.remove('is-right', 'is-wrong');
        lineBox.classList.add('is-solution');
        locked = true;
      },
      reset() {
        locked = false;
        line = [];
        order = shuffleDifferent(tokens.map((t) => t.id));
        lineBox.classList.remove('is-right', 'is-wrong', 'is-solution');
        solutionBox.hidden = true;
        render();
      },
      focus() {
        poolBox.querySelector('button')?.focus();
      },
    };
  },
};
