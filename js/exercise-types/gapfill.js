// Aufgabentyp "gapfill" – Lückentext
//
// Item-Format:
// {
//   "id": 4,
//   "direct": "Sofia: \"I like horror films.\"",          (optional, wird darüber gezeigt)
//   "text": "Sofia said that she {{liked}} horror films.",  Lücken in {{ }}
//   "hint": "simple present → simple past"                  (optional)
// }
// In einer Lücke: Alternativen mit | trennen, z. B. {{the next day|the following day}}
// Auch ( ) für optionale Teile ist erlaubt. Groß-/Kleinschreibung ist in Lücken egal.
//
// Set-Option "display": "text" -> alle Items werden als fortlaufender Text gezeigt
// (z. B. für einen Bericht über einen Dialog).

import { el, inline } from '../util.js';
import { isCorrect, firstSolution } from '../answers.js';

const GAP_RE = /\{\{(.+?)\}\}/g;

export function parseGaps(text) {
  const parts = [];
  let last = 0;
  let m;
  GAP_RE.lastIndex = 0;
  while ((m = GAP_RE.exec(text))) {
    parts.push({ type: 'text', value: text.slice(last, m.index) });
    parts.push({ type: 'gap', value: m[1] });
    last = m.index + m[0].length;
  }
  parts.push({ type: 'text', value: text.slice(last) });
  return parts;
}

export default {
  id: 'gapfill',
  label: 'Gap fill',

  render(item, ctx) {
    const element = el('div', { class: 'gapfill' });
    if (item.direct) element.append(el('p', { class: 'direct', html: inline(item.direct) }));

    const p = el('p', { class: 'gap-text' + (ctx.set.display === 'text' ? ' as-text' : '') });
    const gaps = [];
    let gapNo = 0;
    for (const part of parseGaps(item.text || '')) {
      if (part.type === 'text') {
        p.insertAdjacentHTML('beforeend', inline(part.value));
        continue;
      }
      gapNo++;
      const pattern = `[${part.value}]`;
      const solution = firstSolution(pattern);
      const input = el('input', {
        type: 'text',
        class: 'gap-input',
        autocomplete: 'off',
        autocapitalize: 'off',
        autocorrect: 'off',
        spellcheck: 'false',
        'aria-label': `Task ${ctx.number}, gap ${gapNo}`,
        size: Math.max(5, solution.length + 2),
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          ctx.requestCheck();
        }
      });
      const mark = el('span', { class: 'mark-icon', 'aria-hidden': 'true' });
      const wrap = el('span', { class: 'gap-wrap' }, [input, mark]);
      gaps.push({ input, mark, pattern, solution });
      p.append(wrap);
    }
    element.append(p);

    function clearMarks() {
      for (const g of gaps) {
        g.input.classList.remove('is-right', 'is-wrong', 'is-solution');
        g.input.removeAttribute('aria-invalid');
        g.mark.textContent = '';
        g.mark.className = 'mark-icon';
      }
    }

    return {
      element,
      isEmpty: () => gaps.every((g) => !g.input.value.trim()),
      check() {
        clearMarks();
        let right = 0;
        for (const g of gaps) {
          const ok = isCorrect(g.input.value, g.pattern, { ignoreCase: true });
          g.input.classList.add(ok ? 'is-right' : 'is-wrong');
          g.input.setAttribute('aria-invalid', ok ? 'false' : 'true');
          g.mark.textContent = ok ? '✓' : '✗';
          g.mark.classList.add(ok ? 'right' : 'wrong');
          if (ok) right++;
        }
        const correct = right === gaps.length;
        return {
          correct,
          message: correct || gaps.length === 1 ? null : `${right} of ${gaps.length} gaps are correct.`,
        };
      },
      showSolution() {
        clearMarks();
        for (const g of gaps) {
          g.input.value = g.solution;
          g.input.classList.add('is-solution');
          g.input.readOnly = true;
        }
      },
      reset() {
        clearMarks();
        for (const g of gaps) {
          g.input.value = '';
          g.input.readOnly = false;
        }
      },
      focus() {
        gaps[0]?.input.focus();
      },
    };
  },
};
