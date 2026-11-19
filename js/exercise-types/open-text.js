// Aufgabentyp "open-text" – offene Schreibaufgabe mit Erwartungshorizont
//
// Item-Format:
// {
//   "id": 76,
//   "task": "Write Sofia's report.",
//   "source": ["Mila: School here is really different.", "…"],   Ausgangstext (Zeilen)
//   "sourceTitle": "Mila at dinner",                                (optional)
//   "start": "Mila said that",                                      (optional) Satzanfang
//   "minWords": 50,                                                 (optional)
//   "checklist": ["I backshifted the tenses.", "…"],                Checkliste zur Selbstkontrolle
//   "model": "Mila said that …",                                    Musterlösung (Absätze mit \n)
//   "hint": "…"                                                     (optional)
// }
// Wird nicht automatisch bewertet. Wer alle Punkte der Checkliste abhakt,
// bekommt die Aufgabe als "erledigt" gezählt.

import { el, inline, renderLines, session } from '../util.js';

export default {
  id: 'open-text',
  label: 'Writing',
  // Diese Knöpfe zeigt der Rahmen für diesen Typ (kein "Check")
  controls: ['hint', 'solution', 'retry'],
  labels: { solution: 'Show expectations', retry: 'Start again' },
  solutionNeedsCheck: false,

  render(item, ctx) {
    const element = el('div', { class: 'open-text' });
    const draftKey = `ek8:draft:${ctx.topic.id}:${item.id}`;

    if (item.source) {
      const box = el('div', { class: 'context-box' });
      if (item.sourceTitle) box.append(el('h3', { text: item.sourceTitle }));
      box.append(renderLines(item.source));
      element.append(box);
    }
    element.append(el('p', { class: 'open-task', html: inline(item.task || '') }));

    const textarea = el('textarea', {
      rows: 9,
      autocorrect: 'off',
      spellcheck: 'false',
      'aria-label': `Task ${ctx.number}: your text`,
    });
    textarea.value = session.get(draftKey, item.start ? `${item.start} ` : '');
    const count = el('p', { class: 'word-count', 'aria-live': 'polite' });
    const wordCount = () => (textarea.value.match(/[A-Za-z’'-]+/g) || []).length;
    const updateCount = () => {
      const n = wordCount();
      count.textContent = item.minWords ? `${n} words (aim for at least ${item.minWords})` : `${n} words`;
      session.set(draftKey, textarea.value);
    };
    textarea.addEventListener('input', updateCount);
    updateCount();
    element.append(textarea, count);

    const expectation = el('div', { class: 'solution-box expectation', hidden: true });
    element.append(expectation);

    function buildExpectation() {
      expectation.textContent = '';
      expectation.append(el('h3', { text: '1. Check your text' }));
      expectation.append(el('p', { text: 'Read your text again. Tick each point when your text does it.' }));
      const list = el('ul', { class: 'checklist' });
      const boxes = (item.checklist || []).map((text) => {
        const cb = el('input', { type: 'checkbox' });
        cb.addEventListener('change', onTick);
        list.append(el('li', {}, [el('label', {}, [cb, el('span', { html: inline(text) })])]));
        return cb;
      });
      expectation.append(list);
      const done = el('p', { class: 'status-msg ok', 'aria-live': 'polite' });
      expectation.append(done);

      expectation.append(el('h3', { text: '2. Compare with a model answer' }));
      const modelBtn = el('button', { type: 'button', class: 'btn btn-small', text: 'Show model answer' });
      const model = el('div', { class: 'model-text', hidden: true });
      model.append(...String(item.model || '').split('\n').map((p) => el('p', { html: inline(p) })));
      modelBtn.addEventListener('click', () => {
        model.hidden = !model.hidden;
        modelBtn.textContent = model.hidden ? 'Show model answer' : 'Hide model answer';
      });
      expectation.append(modelBtn, model);
      expectation.append(el('p', { class: 'match-help', text: 'Your text can be different from the model answer and still be correct.' }));

      function onTick() {
        if (boxes.length && boxes.every((b) => b.checked)) {
          const needed = Math.min(20, item.minWords || 20);
          if (wordCount() < needed) {
            done.className = 'status-msg err';
            done.textContent = 'First write your text (at least a few sentences) – then check it.';
            return;
          }
          done.className = 'status-msg ok';
          done.textContent = '✓ Well done! This task counts as done.';
          ctx.markSolved();
        } else {
          done.textContent = '';
        }
      }
    }

    return {
      element,
      check() {
        return { correct: false };
      },
      showSolution() {
        if (expectation.hidden) {
          buildExpectation();
          expectation.hidden = false;
          expectation.querySelector('input')?.focus();
        } else {
          expectation.hidden = true;
        }
      },
      reset() {
        textarea.value = item.start ? `${item.start} ` : '';
        session.remove(draftKey);
        updateCount();
        expectation.hidden = true;
        expectation.textContent = '';
      },
      focus() {
        textarea.focus();
      },
    };
  },
};
