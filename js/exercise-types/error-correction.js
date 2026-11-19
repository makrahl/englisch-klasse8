// Aufgabentyp "error-correction" – Fehler finden und korrigieren
//
// Item-Format:
// {
//   "id": 68,
//   "sentence": "Sofia said me that she was tired.",
//   "errors": ["said", "me"],         Wörter, die als Fehlerstelle zählen (eines davon antippen)
//   "answer": ["Sofia told me (that) she was tired.", "Sofia said to me (that) she was tired."],
//   "hint": "say oder tell?"          (optional)
// }
// Pro Satz höchstens EIN Fehler. Ist der Satz richtig: "errors": [] und kein "answer".
// Dann müssen die Kinder "No mistake" wählen.

import { el, inline } from '../util.js';
import { isCorrect, solutionVariants } from '../answers.js';

const clean = (w) => w.toLowerCase().replace(/[’‘]/g, "'").replace(/^[^\w']+|[^\w']+$/g, '');

export default {
  id: 'error-correction',
  label: 'Find the mistake',

  render(item, ctx) {
    const element = el('div', { class: 'error-correction' });
    const errors = (item.errors || []).map(clean);
    const hasError = errors.length > 0;
    let selected = null; // index des gewählten Wortes, oder 'none'
    let locked = false;

    element.append(el('p', { class: 'ec-step', text: '1. Tap the word with the mistake – or choose “No mistake”.' }));
    const tokenBox = el('div', { class: 'ec-tokens', role: 'group', 'aria-label': 'Words of the sentence' });
    const words = String(item.sentence || '').split(/\s+/).filter(Boolean);
    const tokenButtons = words.map((w, k) => {
      const b = el('button', { type: 'button', class: 'ec-token', 'aria-pressed': 'false', text: w });
      b.addEventListener('click', () => select(k));
      tokenBox.append(b);
      return b;
    });
    const noMistake = el('button', { type: 'button', class: 'btn btn-quiet btn-small ec-nomistake', 'aria-pressed': 'false', text: '✓ No mistake' });
    noMistake.addEventListener('click', () => select('none'));
    element.append(tokenBox, noMistake);

    element.append(el('p', { class: 'ec-step', text: '2. Write the correct sentence.' }));
    const input = el('textarea', {
      rows: 2,
      autocomplete: 'off',
      autocorrect: 'off',
      spellcheck: 'false',
      'aria-label': `Task ${ctx.number}: corrected sentence`,
    });
    input.value = item.sentence || '';
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        ctx.requestCheck();
      }
    });
    const solutionBox = el('div', { class: 'solution-box', hidden: true });
    element.append(input, solutionBox);

    function select(k) {
      if (locked) return;
      selected = selected === k ? null : k;
      tokenButtons.forEach((b, i) => b.setAttribute('aria-pressed', selected === i ? 'true' : 'false'));
      noMistake.setAttribute('aria-pressed', selected === 'none' ? 'true' : 'false');
      input.disabled = selected === 'none';
      clearMarks();
    }

    function clearMarks() {
      input.classList.remove('is-right', 'is-wrong', 'is-solution');
      tokenButtons.forEach((b) => b.classList.remove('is-error-solution', 'is-right', 'is-wrong'));
      noMistake.classList.remove('is-right', 'is-wrong');
      solutionBox.hidden = true;
      solutionBox.textContent = '';
    }

    return {
      element,
      isEmpty: () => selected === null,
      check() {
        clearMarks();
        if (!hasError) {
          const correct = selected === 'none';
          if (!correct && typeof selected === 'number') tokenButtons[selected].classList.add('is-wrong');
          return { correct, message: correct ? 'Yes – this sentence is correct.' : 'Look again: is there really a mistake?' };
        }
        if (selected === 'none') {
          noMistake.classList.add('is-wrong');
          return { correct: false, message: 'There is a mistake in this sentence.' };
        }
        const spotOk = errors.includes(clean(words[selected]));
        const fixOk = isCorrect(input.value, item.answer);
        tokenButtons[selected].classList.add(spotOk ? 'is-right' : 'is-wrong');
        input.classList.add(fixOk ? 'is-right' : 'is-wrong');
        if (spotOk && fixOk) return { correct: true };
        if (spotOk) return { correct: false, message: 'You found the mistake ✓ – but your corrected sentence is not right yet.' };
        if (fixOk) return { correct: false, message: 'Your sentence is correct ✓ – but the mistake is in a different word. Tap the right word.' };
        return { correct: false };
      },
      showSolution() {
        clearMarks();
        if (hasError) {
          tokenButtons.forEach((b, i) => {
            if (errors.includes(clean(words[i]))) b.classList.add('is-error-solution');
          });
          const variants = solutionVariants(item.answer, 2);
          solutionBox.append(el('span', { class: 'label', text: 'Correct sentence' }), el('span', { text: variants[0] }));
          if (variants.length > 1) {
            const ul = el('ul');
            for (const v of variants.slice(1)) ul.append(el('li', { text: v }));
            solutionBox.append(el('span', { class: 'label', text: 'Also correct:', style: 'margin-top:.4rem' }), ul);
          }
        } else {
          solutionBox.append(el('span', { class: 'label', text: 'Solution' }), el('span', { text: 'There is no mistake. The sentence is correct.' }));
        }
        solutionBox.hidden = false;
        locked = true;
        input.readOnly = true;
      },
      reset() {
        locked = false;
        selected = null;
        input.readOnly = false;
        input.disabled = false;
        input.value = item.sentence || '';
        tokenButtons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
        noMistake.setAttribute('aria-pressed', 'false');
        clearMarks();
      },
      focus() {
        tokenButtons[0]?.focus();
      },
      // nur für den Selbsttest
      _solve() {
        if (!hasError) {
          select('none');
          return;
        }
        const k = words.findIndex((w) => errors.includes(clean(w)));
        select(k);
        input.value = solutionVariants(item.answer, 1)[0];
      },
    };
  },
};
