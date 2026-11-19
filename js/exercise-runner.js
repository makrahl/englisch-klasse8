// =====================================================================
// Rahmen für ein Übungsset: Kopf, Fortschritt, Aufgabenkarten mit Knöpfen
// (Check · Hint · Show solution · Try again). Die eigentliche Aufgabe
// liefert das jeweilige Modul aus js/exercise-types/.
//
// Schnittstelle eines Aufgabentyp-Moduls:
//   export default {
//     id: 'typ-name',                 // = Dateiname, = "type" in der JSON-Datei
//     label: 'Name für die Anzeige',
//     controls: ['check','hint','solution','retry'],   // optional
//     labels: { solution: '…' },                       // optional
//     solutionNeedsCheck: true,                        // optional (Standard: true)
//     render(item, ctx) {
//       return {
//         element,                    // DOM-Element der Aufgabe
//         check()        -> { correct: boolean, message?: string }
//         showSolution() -> zeigt die Lösung
//         reset()        -> leert die Aufgabe
//         isEmpty?()     -> true, wenn noch nichts eingegeben wurde
//         focus?()
//       };
//     }
//   }
// ctx = { set, topic, item, number, requestCheck(), markSolved() }
// =====================================================================

import { el, inline } from './util.js';
import { getType } from './exercise-types/index.js';
import { markSolved, isSolved } from './progress.js';

const DEFAULT_CONTROLS = ['check', 'hint', 'solution', 'retry'];
const DEFAULT_LABELS = { check: 'Check', hint: 'Hint', solution: 'Show solution', retry: 'Try again' };

const PRAISE = ['Correct!', 'Well done!', 'Great!', 'Yes, that’s right!', 'Excellent!'];

function feedback(kind, title, text) {
  const icon = { correct: '✓', wrong: '✗', info: 'ℹ' }[kind];
  const box = el('div', { class: `fb fb-${kind}` }, [
    el('span', { class: 'fb-icon', 'aria-hidden': 'true', text: icon }),
    el('span', {}, [el('strong', { text: title }), text ? ' ' : '', text ? el('span', { class: 'fb-text', text }) : '']),
  ]);
  return box;
}

/**
 * Baut eine Aufgabenkarte.
 * @returns {{ node: HTMLElement, reset: Function }}
 */
export function renderItem(item, index, set, topic, rulesLink) {
  const type = getType(set.type);
  const number = index + 1;
  const li = el('li', { class: 'item', id: `task-${number}` });
  const headingId = `task-${number}-label`;
  li.setAttribute('aria-labelledby', headingId);

  if (!type) {
    li.append(el('p', { class: 'error-box', text: `Unknown exercise type "${set.type}".` }));
    return { node: li, reset() {} };
  }

  const state = { checked: false, revealed: false };
  const feedbackBox = el('div', { class: 'feedback', 'aria-live': 'polite' });
  const hintText = item.hint || set.hint;
  const hintBox = el('div', { class: 'hint-box', hidden: true });
  if (hintText) {
    hintBox.insertAdjacentHTML('beforeend', inline(hintText));
    if (rulesLink) {
      hintBox.append(' ', el('a', { href: rulesLink, text: '→ Rules' }));
    }
  }

  const ctx = {
    set,
    topic,
    item,
    number,
    requestCheck: () => doCheck(),
    markSolved: () => {
      markSolved(topic.id, item.id);
      li.classList.add('is-solved-before');
    },
  };

  const instance = type.render(item, ctx);

  const controls = type.controls || DEFAULT_CONTROLS;
  const labels = { ...DEFAULT_LABELS, ...(type.labels || {}) };
  const needsCheck = type.solutionNeedsCheck !== false;
  const buttons = {};
  const controlBox = el('div', { class: 'item-controls' });

  if (controls.includes('check')) {
    buttons.check = el('button', { type: 'button', class: 'btn btn-primary', text: labels.check, onclick: () => doCheck() });
    controlBox.append(buttons.check);
  }
  if (controls.includes('hint') && hintText) {
    buttons.hint = el('button', { type: 'button', class: 'btn btn-quiet', 'aria-expanded': 'false', onclick: toggleHint }, ['💡 ', labels.hint]);
    controlBox.append(buttons.hint);
  }
  if (controls.includes('solution')) {
    buttons.solution = el('button', { type: 'button', class: 'btn btn-quiet', text: labels.solution, onclick: doSolution });
    if (needsCheck) {
      buttons.solution.setAttribute('aria-disabled', 'true');
      buttons.solution.title = 'Check your answer first.';
    }
    controlBox.append(buttons.solution);
  }
  if (controls.includes('retry')) {
    buttons.retry = el('button', { type: 'button', class: 'btn btn-quiet', text: labels.retry, onclick: () => doReset(true) });
    controlBox.append(buttons.retry);
  }

  function toggleHint() {
    hintBox.hidden = !hintBox.hidden;
    buttons.hint.setAttribute('aria-expanded', String(!hintBox.hidden));
  }

  function doCheck() {
    if (!buttons.check) return;
    if (state.revealed) {
      feedbackBox.replaceChildren(feedback('info', 'You have already seen the solution.', 'Press “Try again” to practise this task once more.'));
      return;
    }
    if (instance.isEmpty && instance.isEmpty()) {
      feedbackBox.replaceChildren(feedback('info', 'Please answer first.', ''));
      return;
    }
    const result = instance.check();
    state.checked = true;
    if (buttons.solution) {
      buttons.solution.removeAttribute('aria-disabled');
      buttons.solution.title = '';
    }
    if (result.correct) {
      li.classList.add('is-correct');
      const praise = PRAISE[(item.id ?? number) % PRAISE.length];
      feedbackBox.replaceChildren(feedback('correct', praise, result.message || ''));
      ctx.markSolved();
    } else {
      li.classList.remove('is-correct');
      const tip = hintText && hintBox.hidden ? 'Try again or look at the hint.' : 'Try again or look at the solution.';
      feedbackBox.replaceChildren(feedback('wrong', 'Not quite.', [result.message, tip].filter(Boolean).join(' ')));
    }
  }

  function doSolution() {
    if (needsCheck && !state.checked) {
      feedbackBox.replaceChildren(feedback('info', 'Have a go first!', 'Press “Check” before you look at the solution.'));
      return;
    }
    instance.showSolution();
    if (needsCheck) {
      state.revealed = true;
      li.classList.remove('is-correct');
      feedbackBox.replaceChildren(feedback('info', 'Here is the solution.', 'Press “Try again” to practise this task once more.'));
    }
  }

  function doReset(focus) {
    instance.reset();
    state.checked = false;
    state.revealed = false;
    li.classList.remove('is-correct');
    feedbackBox.replaceChildren();
    hintBox.hidden = true;
    if (buttons.hint) buttons.hint.setAttribute('aria-expanded', 'false');
    if (buttons.solution && needsCheck) {
      buttons.solution.setAttribute('aria-disabled', 'true');
      buttons.solution.title = 'Check your answer first.';
    }
    if (focus && instance.focus) instance.focus();
  }

  const body = el('div', { class: 'item-body' }, [instance.element, hintBox, feedbackBox, controlBox]);
  li.append(
    el('div', { class: 'item-head' }, [
      el('span', { class: 'item-num', id: headingId, 'aria-label': `Task ${number}`, text: String(number) }),
      body,
    ]),
  );
  if (isSolved(topic.id, item.id)) li.classList.add('is-solved-before');

  return { node: li, reset: () => doReset(false), instance, check: doCheck };
}
