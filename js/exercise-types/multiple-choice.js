// Aufgabentyp "multiple-choice"
//
// Item-Format:
// {
//   "id": 14,
//   "direct": "Mila: \"I'm homesick.\"",            (optional)
//   "question": "Mila ___ me that she was homesick.",
//   "options": ["said", "told", "asked"],
//   "answer": "told",                                 genau so wie in "options"
//   "hint": "tell + Person"                           (optional)
// }
// Set-Option "shuffle": true -> Antworten werden gemischt.

import { el, inline, shuffle, uniqueId } from '../util.js';

export default {
  id: 'multiple-choice',
  label: 'Multiple choice',

  render(item, ctx) {
    const name = uniqueId('mc');
    const element = el('div', { class: 'mc' });
    if (item.direct) element.append(el('p', { class: 'direct', html: inline(item.direct) }));

    const fieldset = el('fieldset', { class: 'mc-fieldset' });
    fieldset.append(el('legend', { html: inline(item.question || 'Choose the correct answer.') }));
    const optionsBox = el('div', { class: 'mc-options' });
    const options = ctx.set.shuffle ? shuffle(item.options) : item.options.slice();
    const rows = options.map((text) => {
      const input = el('input', { type: 'radio', name, value: text });
      const mark = el('span', { class: 'mark-icon', 'aria-hidden': 'true' });
      const label = el('label', { class: 'mc-option' }, [input, el('span', { html: inline(text) }), mark]);
      optionsBox.append(label);
      return { input, label, mark, text };
    });
    fieldset.append(optionsBox);
    element.append(fieldset);

    function clearMarks() {
      for (const r of rows) {
        r.label.classList.remove('is-right', 'is-wrong', 'is-solution');
        r.mark.textContent = '';
        r.mark.className = 'mark-icon';
      }
    }

    return {
      element,
      isEmpty: () => !rows.some((r) => r.input.checked),
      check() {
        clearMarks();
        const chosen = rows.find((r) => r.input.checked);
        const correct = !!chosen && chosen.text === item.answer;
        if (chosen) {
          chosen.label.classList.add(correct ? 'is-right' : 'is-wrong');
          chosen.mark.textContent = correct ? '✓' : '✗';
          chosen.mark.classList.add(correct ? 'right' : 'wrong');
        }
        return { correct };
      },
      showSolution() {
        clearMarks();
        for (const r of rows) {
          if (r.text === item.answer) {
            r.input.checked = true;
            r.label.classList.add('is-solution');
            r.mark.textContent = '✓';
            r.mark.classList.add('right');
          }
          r.input.disabled = true;
        }
      },
      reset() {
        clearMarks();
        for (const r of rows) {
          r.input.checked = false;
          r.input.disabled = false;
        }
      },
      focus() {
        rows[0]?.input.focus();
      },
    };
  },
};
