// Aufgabentyp "match" – Zuordnung
//
// Item-Format:
// {
//   "id": 1,
//   "prompt": "Match the tenses.",                    (optional)
//   "pairs": [
//     ["simple present", "simple past"],
//     ["will", "would"]
//   ],
//   "hint": "…"                                        (optional)
// }
// Rechte Seiten dürfen sich wiederholen (z. B. zweimal "past perfect").
//
// Bedienung (alles gleichwertig):
//   - Antippen/Klicken: Karte antippen, dann das Feld antippen
//   - Ziehen mit Maus oder Finger (Drag & Drop)
//   - Tastatur: Tab zur Karte, Enter/Leertaste, Tab zum Feld, Enter/Leertaste
// Eine Karte im Feld antippen = zurück in den Kartenstapel.

import { el, inline, shuffleDifferent } from '../util.js';

export default {
  id: 'match',
  label: 'Matching',

  render(item, ctx) {
    const element = el('div', { class: 'match' });
    if (item.prompt) element.append(el('p', { class: 'prompt', html: inline(item.prompt) }));
    element.append(
      el('p', { class: 'match-help', text: 'Tap a box and choose the right card. You can also tap a card first, or drag a card into a box.' }),
    );
    const status = el('p', { class: 'sr-only', 'aria-live': 'polite' });

    const pairs = item.pairs || [];
    const cards = pairs.map((p, k) => ({ id: k, text: p[1] }));
    const slots = []; // { index, expected, button, cardId, mark }
    let selected = null; // card id

    const rowsList = el('ul', { class: 'match-rows' });
    pairs.forEach((pair, index) => {
      const button = el('button', { type: 'button', class: 'match-slot', 'data-slot': index });
      const mark = el('span', { class: 'mark-icon', 'aria-hidden': 'true' });
      const picker = el('div', { class: 'match-picker', hidden: true, role: 'group', 'aria-label': 'Choose a card' });
      const slot = { index, expected: pair[1], left: pair[0], button, cardId: null, mark, picker };
      button.addEventListener('click', () => onSlotClick(slot));
      slots.push(slot);
      rowsList.append(
        el('li', { class: 'match-row' }, [
          el('span', { class: 'match-left', html: inline(pair[0]) }),
          el('span', { class: 'match-arrow', 'aria-hidden': 'true', text: '→' }),
          button,
          picker,
        ]),
      );
    });

    // Auswahlliste direkt am Feld (praktisch auf dem Handy)
    function closePickers() {
      for (const s of slots) {
        s.picker.hidden = true;
        s.picker.textContent = '';
        s.button.setAttribute('aria-expanded', 'false');
      }
    }
    function openPicker(slot) {
      closePickers();
      const used = new Set(slots.map((s) => s.cardId).filter((x) => x !== null));
      const free = order.filter((id) => !used.has(id));
      for (const id of free) {
        const b = el('button', { type: 'button', class: 'chip wo-chip', html: inline(cardText(id)) });
        b.addEventListener('click', () => {
          closePickers();
          place(id, slot);
        });
        slot.picker.append(b);
      }
      slot.picker.append(el('button', { type: 'button', class: 'btn btn-quiet btn-small', text: 'Cancel', onclick: () => { closePickers(); slot.button.focus(); } }));
      slot.picker.hidden = false;
      slot.button.setAttribute('aria-expanded', 'true');
      slot.picker.querySelector('button')?.focus();
    }

    const pool = el('div', { class: 'match-pool', 'data-pool': '1' });
    element.append(rowsList, pool, status);

    let order = shuffleDifferent(cards.map((c) => c.id));
    let locked = false;

    function cardText(id) {
      return cards[id].text;
    }

    function makeChip(id, inSlot) {
      const chip = el('button', {
        type: 'button',
        class: 'chip' + (inSlot ? ' chip-in-slot' : ''),
        'aria-pressed': selected === id ? 'true' : 'false',
        'data-card': id,
        html: inline(cardText(id)),
      });
      enableDrag(chip, id);
      return chip;
    }

    function render() {
      // Felder
      for (const slot of slots) {
        slot.button.textContent = '';
        slot.button.classList.toggle('filled', slot.cardId !== null);
        slot.button.classList.toggle('awaiting', selected !== null && slot.cardId === null);
        if (slot.cardId !== null) {
          slot.button.insertAdjacentHTML('beforeend', `<span>${inline(cardText(slot.cardId))}</span>`);
          slot.button.setAttribute('aria-label', `${stripTags(slot.left)}: ${cardText(slot.cardId)}. Activate to remove.`);
        } else {
          slot.button.append(el('span', { text: selected !== null ? 'Put it here' : '…' }));
          slot.button.setAttribute('aria-label', `${stripTags(slot.left)}: empty box`);
        }
        slot.button.append(slot.mark);
      }
      // Kartenstapel
      pool.textContent = '';
      pool.append(el('p', { class: 'match-pool-label', text: 'Cards:' }));
      const used = new Set(slots.map((s) => s.cardId).filter((x) => x !== null));
      for (const id of order) {
        if (!used.has(id)) pool.append(makeChip(id, false));
      }
      if (used.size === cards.length) pool.append(el('span', { class: 'match-help', text: 'All cards are placed. Now press “Check”.' }));
    }

    function stripTags(s) {
      return String(s).replace(/[*=`]/g, '');
    }

    function clearMarks() {
      for (const s of slots) {
        s.button.classList.remove('is-right', 'is-wrong', 'is-solution');
        s.mark.textContent = '';
        s.mark.className = 'mark-icon';
      }
    }

    function place(cardId, slot) {
      if (locked) return;
      closePickers();
      clearMarks();
      // Karte aus ihrem bisherigen Feld nehmen
      for (const s of slots) if (s.cardId === cardId) s.cardId = null;
      slot.cardId = cardId;
      selected = null;
      status.textContent = `Placed “${cardText(cardId)}” next to “${stripTags(slot.left)}”.`;
      render();
      slot.button.focus();
    }

    function toPool(cardId) {
      if (locked) return;
      clearMarks();
      for (const s of slots) if (s.cardId === cardId) s.cardId = null;
      selected = null;
      render();
    }

    function onSlotClick(slot) {
      if (locked) return;
      if (selected !== null) {
        place(selected, slot);
      } else if (slot.cardId !== null) {
        const id = slot.cardId;
        toPool(id);
        status.textContent = `“${cardText(id)}” is back with the cards.`;
      } else if (!slot.picker.hidden) {
        closePickers();
      } else {
        openPicker(slot);
      }
    }

    pool.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-card]');
      if (!chip || locked) return;
      if (chip.dataset.justDragged) {
        delete chip.dataset.justDragged;
        return;
      }
      const id = Number(chip.dataset.card);
      closePickers();
      selected = selected === id ? null : id;
      render();
      status.textContent = selected !== null ? `Selected “${cardText(id)}”. Now choose a box.` : 'Selection cancelled.';
      // Fokus auf das erste freie Feld legen erleichtert die Tastaturbedienung nicht immer –
      // daher bleibt der Fokus auf der Karte.
      const again = pool.querySelector(`[data-card="${id}"]`);
      again?.focus();
    });

    // ---- Drag & Drop mit Pointer-Events (Maus, Finger, Stift) ----
    function enableDrag(chip, id) {
      chip.addEventListener('pointerdown', (down) => {
        if (locked || down.button > 0) return;
        const startX = down.clientX;
        const startY = down.clientY;
        let ghost = null;
        let target = null;

        const move = (e) => {
          if (!ghost) {
            if (Math.hypot(e.clientX - startX, e.clientY - startY) < 8) return;
            ghost = chip.cloneNode(true);
            ghost.classList.add('drag-ghost');
            ghost.removeAttribute('data-card');
            document.body.append(ghost);
            chip.style.opacity = '0.35';
          }
          e.preventDefault();
          ghost.style.left = `${e.clientX}px`;
          ghost.style.top = `${e.clientY}px`;
          const under = document.elementFromPoint(e.clientX, e.clientY);
          const newTarget = under?.closest('.match-slot, .match-pool');
          if (newTarget !== target) {
            target?.classList.remove('drop-target');
            target = newTarget && element.contains(newTarget) ? newTarget : null;
            target?.classList.add('drop-target');
          }
        };
        const up = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          window.removeEventListener('pointercancel', up);
          if (!ghost) return; // war nur ein Klick
          ghost.remove();
          chip.style.opacity = '';
          target?.classList.remove('drop-target');
          chip.dataset.justDragged = '1';
          setTimeout(() => delete chip.dataset.justDragged, 50);
          if (target?.classList.contains('match-slot')) {
            place(id, slots[Number(target.dataset.slot)]);
          } else if (target?.classList.contains('match-pool')) {
            toPool(id);
          }
        };
        window.addEventListener('pointermove', move, { passive: false });
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
      });
    }

    render();

    return {
      element,
      isEmpty: () => slots.every((s) => s.cardId === null),
      check() {
        clearMarks();
        let right = 0;
        for (const s of slots) {
          const ok = s.cardId !== null && cardText(s.cardId) === s.expected;
          s.button.classList.add(ok ? 'is-right' : 'is-wrong');
          s.mark.textContent = ok ? '✓' : '✗';
          s.mark.classList.add(ok ? 'right' : 'wrong');
          if (ok) right++;
        }
        const correct = right === slots.length;
        return { correct, message: correct ? null : `${right} of ${slots.length} are correct.` };
      },
      showSolution() {
        closePickers();
        clearMarks();
        selected = null;
        // Jedem Feld eine Karte mit passendem Text geben
        const free = cards.map((c) => c.id);
        for (const s of slots) {
          const k = free.findIndex((id) => cardText(id) === s.expected);
          s.cardId = free.splice(k, 1)[0];
        }
        render();
        for (const s of slots) s.button.classList.add('is-solution');
        locked = true;
      },
      reset() {
        closePickers();
        locked = false;
        selected = null;
        for (const s of slots) s.cardId = null;
        order = shuffleDifferent(cards.map((c) => c.id));
        clearMarks();
        render();
      },
      focus() {
        pool.querySelector('[data-card]')?.focus();
      },
      // nur für den Selbsttest
      _placeWrong() {
        // alle Karten in umgekehrter Reihenfolge einsetzen
        const ids = cards.map((c) => c.id).reverse();
        slots.forEach((s, k) => (s.cardId = ids[k]));
        render();
      },
    };
  },
};
