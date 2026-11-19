// =====================================================================
// Start der App: Navigation (über #-Adressen) und die einzelnen Seiten.
//
//   #/                              Startseite (Themen)
//   #/t/<thema>                     Themenseite
//   #/t/<thema>/rules[/<anker>]     Regeln
//   #/t/<thema>/exercises           Übersicht der Übungssets
//   #/t/<thema>/x/<set-id>          ein Übungsset
//   #/t/<thema>/check-code          Fortschrittscode ansehen (Lehrkraft)
// =====================================================================

import { el, inline, inlineEl, renderLines, stars, LEVEL_NAMES, copyText } from './util.js';
import { loadTopics, loadTopic, loadRules, ContentError } from './content.js';
import { renderMarkdown } from './markdown.js';
import { getType } from './exercise-types/index.js';
import { renderItem } from './exercise-runner.js';
import {
  countSolved, encodeProgress, decodeProgress, loadProgress, onProgressChange,
} from './progress.js';

const main = document.getElementById('main');
const APP_TITLE = 'English Practice · Year 8';
let cleanup = [];

function runCleanup() {
  for (const fn of cleanup) fn();
  cleanup = [];
}

function setPage(title, nodes) {
  main.replaceChildren(...nodes.filter(Boolean));
  document.title = title ? `${title} – ${APP_TITLE}` : APP_TITLE;
}

function focusMain() {
  const h1 = main.querySelector('h1');
  if (h1) {
    h1.setAttribute('tabindex', '-1');
    h1.focus({ preventScroll: true });
  }
  window.scrollTo(0, 0);
}

function breadcrumb(parts) {
  const ol = el('ol');
  parts.forEach(([label, href], k) => {
    const li = el('li');
    if (href && k < parts.length - 1) li.append(el('a', { href, text: label }));
    else li.append(el('span', { 'aria-current': 'page', text: label }));
    ol.append(li);
  });
  return el('nav', { class: 'breadcrumb', 'aria-label': 'Breadcrumb' }, [ol]);
}

function progressLine(done, total, label) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return el('div', { class: 'progress-line' }, [
    label ? el('span', { text: label }) : null,
    el('div', {
      class: 'progress-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(done),
      'aria-label': `${done} of ${total} correct`,
    }, [el('span', { style: `width:${pct}%` })]),
    el('span', { class: 'progress-count', text: `${done}/${total}` }),
  ]);
}

function showError(err) {
  console.error(err);
  const isContent = err instanceof ContentError;
  setPage('Error', [
    el('div', { class: 'error-box', role: 'alert' }, [
      el('h2', { text: isContent ? 'Problem in a content file' : 'Something went wrong' }),
      el('p', { text: isContent ? 'Please tell your teacher. (Für die Lehrkraft: Die Datei enthält einen Fehler – bitte das Prüfskript laufen lassen.)' : 'Please reload the page.' }),
      el('pre', { text: err.message }),
    ]),
    el('p', {}, [el('a', { href: '#/', text: '← Back to the start page' })]),
  ]);
}

// ---------------------------------------------------------------------
// Startseite
// ---------------------------------------------------------------------
async function pageHome() {
  const topics = await loadTopics();
  const tiles = el('div', { class: 'tiles' });
  for (const t of topics) {
    tiles.append(
      el('a', { class: 'tile', href: `#/t/${t.id}` }, [
        el('span', { class: 'tile-icon', 'aria-hidden': 'true', text: t.icon || '📘' }),
        el('div', {}, [el('h2', { text: t.title }), inlineEl('p', t.description || '')]),
      ]),
    );
  }
  tiles.append(
    el('div', { class: 'tile tile-soon' }, [
      el('span', { class: 'tile-icon', 'aria-hidden': 'true', text: '🔜' }),
      el('div', {}, [el('h2', { text: 'More topics' }), el('p', { text: 'New grammar and vocabulary topics will appear here during the school year.' })]),
    ]),
  );
  setPage('', [
    el('h1', { text: 'Practise your English' }),
    el('p', { text: 'Choose a topic. Each topic has rules (explanations) and lots of exercises with instant feedback.' }),
    tiles,
  ]);
}

// ---------------------------------------------------------------------
// Fortschrittscode-Kasten
// ---------------------------------------------------------------------
function codeBox(topic) {
  const value = el('div', { class: 'code-value', 'aria-live': 'polite' });
  const status = el('p', { class: 'status-msg', 'aria-live': 'polite' });
  const total = topic.sets.reduce((n, s) => n + s.items.length, 0);
  const summary = el('p');

  function update() {
    value.textContent = encodeProgress(topic);
    const solved = topic.sets.reduce((n, s) => n + countSolved(topic.id, s.items), 0);
    summary.textContent = solved
      ? `You have solved ${solved} of ${total} tasks in this topic. Save this code to continue later:`
      : 'You haven’t solved any tasks yet. When you have, your code will save your progress.';
  }
  update();
  cleanup.push(onProgressChange((id) => id === topic.id && update()));

  const copyBtn = el('button', {
    type: 'button', class: 'btn btn-small', text: 'Copy code',
    onclick: async () => {
      const ok = await copyText(value.textContent);
      status.className = `status-msg ${ok ? 'ok' : 'err'}`;
      status.textContent = ok ? '✓ Copied! Paste it into your notes app or write it down.' : 'Copying didn’t work. Please write the code down.';
    },
  });

  const inputId = `code-input-${topic.id}`;
  const input = el('input', { type: 'text', id: inputId, autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', placeholder: `${topic.codePrefix || ''}-…` });
  const form = el('form', { class: 'code-form' }, [
    input,
    el('button', { type: 'submit', class: 'btn btn-primary btn-small', text: 'Load code' }),
  ]);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const res = loadProgress(topic, input.value);
    status.className = `status-msg ${res.ok ? 'ok' : 'err'}`;
    status.textContent = res.ok ? `✓ Code loaded. You can continue where you stopped (${res.total} tasks solved).` : `✗ ${res.error}`;
    if (res.ok) input.value = '';
    update();
  });

  return el('section', { class: 'card code-box', 'aria-labelledby': `code-h-${topic.id}` }, [
    el('h2', { id: `code-h-${topic.id}`, text: '🔑 Your progress code' }),
    summary,
    value,
    el('div', { class: 'btn-row' }, [copyBtn]),
    el('label', { for: inputId, style: 'display:block;margin-top:1rem;font-weight:600', text: 'Continue with a code from last time:' }),
    form,
    status,
  ]);
}

// ---------------------------------------------------------------------
// Themenseite
// ---------------------------------------------------------------------
async function pageTopic(topicId) {
  const topic = await loadTopic(topicId);
  const total = topic.sets.reduce((n, s) => n + s.items.length, 0);
  const progressHolder = el('div');
  const renderProgress = () => {
    const solved = topic.sets.reduce((n, s) => n + countSolved(topic.id, s.items), 0);
    progressHolder.replaceChildren(progressLine(solved, total, 'Your progress:'));
  };
  renderProgress();
  cleanup.push(onProgressChange((id) => id === topic.id && renderProgress()));
  setPage(topic.title, [
    breadcrumb([['Home', '#/'], [topic.title]]),
    el('h1', { text: topic.title }),
    topic.description ? inlineEl('p', topic.description) : null,
    el('div', { class: 'big-choice' }, [
      el('a', { href: `#/t/${topic.id}/rules` }, [el('span', { class: 'icon', 'aria-hidden': 'true', text: '📖' }), 'Rules', el('small', { text: 'Explanations & examples' })]),
      el('a', { href: `#/t/${topic.id}/exercises` }, [el('span', { class: 'icon', 'aria-hidden': 'true', text: '✏️' }), 'Exercises', el('small', { text: `${topic.sets.length} sets · ${total} tasks` })]),
    ]),
    progressHolder,
    codeBox(topic),
    el('p', { class: 'help-link' }, [el('a', { href: `#/t/${topic.id}/check-code`, text: 'For teachers: look at a progress code' })]),
  ].filter(Boolean));
  focusMain();
}

// ---------------------------------------------------------------------
// Regeln
// ---------------------------------------------------------------------
async function pageRules(topicId, anchor) {
  const topic = await loadTopic(topicId);
  const md = await loadRules(topic);
  const { html, headings } = renderMarkdown(md);
  const article = el('article', { class: 'rules', lang: topic.rulesLang || 'de', html });

  const tocItems = headings.filter((h) => h.level === 2);
  const toc = tocItems.length
    ? el('nav', { class: 'toc', 'aria-label': 'Contents' }, [
      el('h2', { text: 'Contents' }),
      el('ul', {}, tocItems.map((h) => el('li', {}, [el('a', { href: `#/t/${topic.id}/rules/${h.id}`, html: inline(h.text) })]))),
    ])
    : null;
  // Toc direkt nach der H1 einfügen
  const h1 = article.querySelector('h1');
  if (toc) {
    if (h1) h1.after(toc);
    else article.prepend(toc);
  }

  setPage(`Rules – ${topic.title}`, [
    breadcrumb([['Home', '#/'], [topic.title, `#/t/${topic.id}`], ['Rules']]),
    article,
    el('p', { class: 'set-footer' }, [
      el('a', { class: 'btn', href: `#/t/${topic.id}`, text: '← Back' }),
      el('a', { class: 'btn btn-primary', href: `#/t/${topic.id}/exercises`, text: 'Go to the exercises →' }),
    ]),
  ]);
  if (anchor) {
    const target = document.getElementById(anchor);
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.scrollIntoView();
      target.focus({ preventScroll: true });
      return;
    }
  }
  focusMain();
}

// ---------------------------------------------------------------------
// Übersicht der Übungssets
// ---------------------------------------------------------------------
function setMeta(set) {
  const type = getType(set.type);
  return el('span', { class: 'set-meta' }, [
    el('span', { class: 'badge' }, [el('span', { class: 'stars', 'aria-hidden': 'true', text: stars(set.level) }), ` ${LEVEL_NAMES[set.level] || ''}`]),
    el('span', { text: type ? type.label : set.type }),
    el('span', { text: `${set.items.length} ${set.items.length === 1 ? 'task' : 'tasks'}` }),
  ]);
}

async function pageExercises(topicId) {
  const topic = await loadTopic(topicId);
  const sections = topic.subtopics.map((sub) => {
    const list = el('ul', { class: 'set-list' });
    for (const set of sub.sets) {
      const done = countSolved(topic.id, set.items);
      const total = set.items.length;
      list.append(
        el('li', {}, [
          el('a', { class: 'set-link', href: `#/t/${topic.id}/x/${set.id}` }, [
            el('span', { class: 'set-title', text: set.title }),
            el('span', { class: `set-score${done === total && total ? ' done' : ''}`, 'aria-label': `${done} of ${total} solved`, text: `${done === total && total ? '✓ ' : ''}${done}/${total}` }),
            setMeta(set),
          ]),
        ]),
      );
    }
    return el('section', { class: 'subtopic', 'aria-labelledby': `sub-${sub.id}` }, [
      el('h2', { id: `sub-${sub.id}`, text: sub.title }),
      sub.description ? inlineEl('p', sub.description) : null,
      list,
    ]);
  });
  setPage(`Exercises – ${topic.title}`, [
    breadcrumb([['Home', '#/'], [topic.title, `#/t/${topic.id}`], ['Exercises']]),
    el('h1', { text: `${topic.title}: Exercises` }),
    el('p', {}, [
      'Levels: ', el('span', { class: 'stars', 'aria-hidden': 'true', text: '★☆☆' }), ' Basic · ',
      el('span', { class: 'stars', 'aria-hidden': 'true', text: '★★☆' }), ' Intermediate · ',
      el('span', { class: 'stars', 'aria-hidden': 'true', text: '★★★' }), ' Advanced. ',
      'Need help? ', el('a', { href: `#/t/${topic.id}/rules`, text: 'Read the rules' }), '.',
    ]),
    ...sections,
    codeBox(topic),
  ]);
  focusMain();
}

// ---------------------------------------------------------------------
// Ein Übungsset
// ---------------------------------------------------------------------
async function pageSet(topicId, setId) {
  const topic = await loadTopic(topicId);
  const set = topic.setsById.get(setId);
  if (!set) {
    setPage('Not found', [el('h1', { text: 'Exercise not found' }), el('p', {}, [el('a', { href: `#/t/${topic.id}/exercises`, text: '← Back to the exercises' })])]);
    return;
  }
  const sub = topic.subtopics.find((s) => s.id === set.subtopic);
  const rulesLink = set.rulesRef ? `#/t/${topic.id}/rules/${set.rulesRef}` : `#/t/${topic.id}/rules`;

  const progressHolder = el('div', { class: 'sticky-progress' });
  const renderProgress = () => progressHolder.replaceChildren(progressLine(countSolved(topic.id, set.items), set.items.length, 'Solved:'));
  renderProgress();
  cleanup.push(onProgressChange((id) => id === topic.id && renderProgress()));

  const list = el('ol', { class: 'items' });
  const rendered = set.items.map((item, k) => renderItem(item, k, set, topic, rulesLink));
  for (const r of rendered) list.append(r.node);

  const idx = topic.sets.indexOf(set);
  const next = topic.sets[idx + 1];
  const prev = topic.sets[idx - 1];

  const context = set.context
    ? el('section', { class: 'context-box', 'aria-label': set.contextTitle || 'Text' }, [
      set.contextTitle ? el('h2', { text: set.contextTitle }) : null,
      renderLines(set.context),
    ])
    : null;

  setPage(set.title, [
    breadcrumb([['Home', '#/'], [topic.title, `#/t/${topic.id}`], ['Exercises', `#/t/${topic.id}/exercises`], [set.title]]),
    el('header', { class: 'set-header' }, [
      el('h1', { text: set.title }),
      setMeta(set),
      sub ? el('p', { class: 'help-link' }, [`${sub.title} · `, el('a', { href: rulesLink, text: '📖 Rules for this exercise' })]) : null,
      set.instructions ? inlineEl('p', set.instructions, { class: 'instructions' }) : null,
    ]),
    progressHolder,
    context,
    list,
    el('div', { class: 'set-footer' }, [
      el('button', {
        type: 'button', class: 'btn btn-quiet', text: '↺ Reset all tasks',
        onclick: () => {
          rendered.forEach((r) => r.reset());
          focusMain();
        },
      }),
      el('div', { class: 'btn-row', style: 'margin:0' }, [
        prev ? el('a', { class: 'btn', href: `#/t/${topic.id}/x/${prev.id}`, text: '← Previous' }) : null,
        next ? el('a', { class: 'btn btn-primary', href: `#/t/${topic.id}/x/${next.id}`, text: 'Next exercise →' }) : el('a', { class: 'btn btn-primary', href: `#/t/${topic.id}/exercises`, text: 'Back to the overview' }),
      ]),
    ]),
  ]);
  focusMain();
}

// ---------------------------------------------------------------------
// Lehreransicht: Code ansehen
// ---------------------------------------------------------------------
async function pageCheckCode(topicId) {
  const topic = await loadTopic(topicId);
  const result = el('div', { 'aria-live': 'polite' });
  const input = el('input', { type: 'text', id: 'teacher-code', autocomplete: 'off', spellcheck: 'false', placeholder: `${topic.codePrefix || ''}-…` });
  const form = el('form', { class: 'code-form' }, [input, el('button', { type: 'submit', class: 'btn btn-primary btn-small', text: 'Show progress' })]);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const res = decodeProgress(topic, input.value);
    if (!res.ok) {
      result.replaceChildren(el('p', { class: 'status-msg err', text: `✗ ${res.error}` }));
      return;
    }
    const table = el('table', { class: 'teacher-table' });
    table.append(el('thead', {}, [el('tr', {}, [el('th', { text: 'Exercise' }), el('th', { text: 'Level' }), el('th', { text: 'Solved' })])]));
    const tbody = el('tbody');
    let all = 0;
    let solvedAll = 0;
    for (const sub of topic.subtopics) {
      tbody.append(el('tr', {}, [el('th', { colspan: '3', text: sub.title })]));
      for (const set of sub.sets) {
        const n = set.items.filter((it) => res.ids.has(it.id)).length;
        all += set.items.length;
        solvedAll += n;
        tbody.append(el('tr', {}, [el('td', { text: set.title }), el('td', { class: 'stars', text: stars(set.level) }), el('td', { text: `${n}/${set.items.length}` })]));
      }
    }
    table.append(tbody);
    result.replaceChildren(el('p', { class: 'status-msg ok', text: `✓ Valid code: ${solvedAll} of ${all} tasks solved.` }), el('div', { class: 'table-wrap' }, [table]));
  });
  setPage(`Check a code – ${topic.title}`, [
    breadcrumb([['Home', '#/'], [topic.title, `#/t/${topic.id}`], ['Check a code']]),
    el('h1', { text: 'Look at a progress code' }),
    el('p', { lang: 'de', text: 'Für Lehrkräfte: Hier sehen Sie, welche Aufgaben mit einem Code gelöst wurden. Der eigene Fortschritt in diesem Tab wird dabei nicht verändert. Hinweis: Der Code ist kein Leistungsnachweis – er lässt sich nicht gegen Weitergabe schützen.' }),
    el('label', { for: 'teacher-code', style: 'font-weight:600', text: 'Progress code:' }),
    form,
    result,
  ]);
  focusMain();
}

// ---------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------
async function route() {
  const hash = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const parts = hash.split('/').filter(Boolean);
  runCleanup();
  try {
    if (parts.length === 0) return await pageHome();
    if (parts[0] === 't' && parts[1]) {
      const topicId = parts[1];
      if (parts.length === 2) return await pageTopic(topicId);
      if (parts[2] === 'rules') return await pageRules(topicId, parts[3]);
      if (parts[2] === 'exercises') return await pageExercises(topicId);
      if (parts[2] === 'x' && parts[3]) return await pageSet(topicId, parts[3]);
      if (parts[2] === 'check-code') return await pageCheckCode(topicId);
    }
    setPage('Not found', [el('h1', { text: 'Page not found' }), el('p', {}, [el('a', { href: '#/', text: '← Back to the start page' })])]);
  } catch (err) {
    showError(err);
  }
}

window.addEventListener('hashchange', route);
route();
