// Aufgabentyp "transform" – Satzumformung (ganzer Satz)
//
// Item-Format:
// {
//   "id": 52,
//   "direct": "Mila: \"I'm hungry.\"",            der Ausgangssatz
//   "start": "Mila said",                           (optional) steht schon im Eingabefeld
//   "answer": "Mila said (that) she was hungry.",  ein Muster oder eine Liste von Mustern
//   "hint": "I → she, am → was"                    (optional)
// }
// Muster: (that) = optional, [if|whether] = Alternativen. Siehe js/answers.js.
// Set-Option "promptLabel": "reported" -> der Ausgangssatz wird als
// "Reported speech" beschriftet (z. B. für die Rückumformung reported → direct).

import { el, inline } from '../util.js';
import { isCorrect, solutionVariants } from '../answers.js';

export default {
  id: 'transform',
  label: 'Rewrite the sentence',

  render(item, ctx) {
    const element = el('div', { class: 'transform' });
    const labelClass = ctx.set.promptLabel === 'reported' ? 'direct reported' : ctx.set.promptLabel === 'none' ? 'direct no-label' : 'direct';
    if (item.direct) element.append(el('p', { class: labelClass, html: inline(item.direct) }));
    if (item.question) element.append(el('p', { class: 'prompt', html: inline(item.question) }));

    const startText = item.start ? `${item.start.trim()} ` : '';
    const input = el('textarea', {
      class: 'transform-input',
      rows: 2,
      autocomplete: 'off',
      autocapitalize: 'sentences',
      autocorrect: 'off',
      spellcheck: 'false',
      'aria-label': `Task ${ctx.number}: your sentence`,
    });
    input.value = startText;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        ctx.requestCheck();
      }
    });
    const solutionBox = el('div', { class: 'solution-box', hidden: true });
    element.append(input, solutionBox);

    function clear() {
      input.classList.remove('is-right', 'is-wrong', 'is-solution');
      input.removeAttribute('aria-invalid');
      solutionBox.hidden = true;
      solutionBox.textContent = '';
    }

    return {
      element,
      isEmpty: () => !input.value.trim() || input.value.trim() === startText.trim(),
      check() {
        clear();
        const correct = isCorrect(input.value, item.answer);
        input.classList.add(correct ? 'is-right' : 'is-wrong');
        input.setAttribute('aria-invalid', correct ? 'false' : 'true');
        return { correct };
      },
      showSolution() {
        clear();
        const variants = solutionVariants(item.answer, 3);
        solutionBox.append(el('span', { class: 'label', text: 'Solution' }), el('span', { text: variants[0] }));
        if (variants.length > 1) {
          const ul = el('ul');
          for (const v of variants.slice(1)) ul.append(el('li', { text: v }));
          solutionBox.append(el('span', { class: 'label', text: 'Also correct:', style: 'margin-top:.4rem' }), ul);
        }
        solutionBox.hidden = false;
        input.classList.add('is-solution');
        input.readOnly = true;
      },
      reset() {
        clear();
        input.value = startText;
        input.readOnly = false;
      },
      focus() {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      },
      // nur für den Selbsttest
      _fill(text) {
        input.value = text;
      },
    };
  },
};
