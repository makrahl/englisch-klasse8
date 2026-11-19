// Selbsttest: öffnet jede Aufgabe unsichtbar, löst sie richtig und falsch
// und prüft, ob die Bewertung stimmt. Aufruf: tools/selftest.html im Browser
// (über einen lokalen Server, z. B. python3 -m http.server).

import { isCorrect, expandPattern, normalize } from '../js/answers.js';
import { getType } from '../js/exercise-types/index.js';
import { renderMarkdown } from '../js/markdown.js';
import { encodeProgress, decodeProgress } from '../js/progress.js';

const log = document.getElementById('log');
const summary = document.getElementById('summary');
const sandbox = document.getElementById('sandbox');
let passed = 0;
const failures = [];

function ok(cond, label) {
  if (cond) passed++;
  else {
    failures.push(label);
    const li = document.createElement('li');
    li.className = 'fail';
    li.textContent = '✗ ' + label;
    log.append(li);
  }
}

// ---------------- Antwortprüfung ----------------
function unitTests() {
  const yes = (given, pattern, opt) => ok(isCorrect(given, pattern, opt), `soll richtig sein: "${given}" ~ "${pattern}"`);
  const no = (given, pattern, opt) => ok(!isCorrect(given, pattern, opt), `soll falsch sein: "${given}" ~ "${pattern}"`);

  yes('Mila said she was hungry.', 'Mila said (that) she was hungry.');
  yes('Mila said that she was hungry', 'Mila said (that) she was hungry.');
  yes('mila said   that she was hungry!', 'Mila said (that) she was hungry.');
  yes('"Mila said that she was hungry."', 'Mila said (that) she was hungry.');
  no('Mila said that she is hungry.', 'Mila said (that) she was hungry.');
  no('Mila said that that she was hungry.', 'Mila said (that) she was hungry.');
  yes('He asked whether I liked pizza.', 'He asked [if|whether] I liked pizza.');
  yes('He asked if I liked pizza.', 'He asked [if|whether] I liked pizza.');
  no('He asked that I liked pizza.', 'He asked [if|whether] I liked pizza.');
  yes("Tyler said he didn't understand.", 'Tyler said (that) he did not understand.');
  yes('Tyler said he did not understand.', "Tyler said (that) he didn't understand.");
  yes('Tyler said he didn’t understand.', "Tyler said (that) he didn't understand.");
  yes("She said she couldn't come.", 'She said (that) she could not come.');
  yes('She said she cannot come.', "She said (that) she can't come.");
  yes("He said he'd seen it.", 'He said (that) he had seen it.');
  yes("He said he'd help.", 'He said (that) he would help.');
  no("He said he'd help.", 'He said (that) he had helped.');
  yes("Diego said it's late.", 'Diego said (that) it is late.');
  yes("Mila's mum told her to go.", "Mila's mum told her to go.");
  yes('My mom told me to call her.', 'My mum told me to call her.');
  yes('They were practicing.', 'They were practising.');
  yes('Mrs. Moreno said hello.', 'Mrs Moreno said hello.');
  yes('Diego, stay here!', 'Diego stay here!');
  yes('PLAYED', 'played', { ignoreCase: true });
  yes('the following day', '[the next day|the following day]', { ignoreCase: true });
  no('next day', '[the next day|the following day]', { ignoreCase: true });
  no('', 'anything');
  no('Mila said she was Hungry.', 'Mila said (that) she was hungry.');
  ok(expandPattern('a (b )c').length === 2, 'expandPattern optional');
  ok(expandPattern('[a|b] [c|d]').length === 4, 'expandPattern alternatives');
  ok(expandPattern('x [a|b (c)]').includes('x b c'), 'expandPattern nested');
  ok(normalize("I'm here").includes('i am here'), 'normalize contraction');

  // Markdown
  const md = renderMarkdown('# T\n\n## A {#a}\n\n| x | y |\n|---|---|\n| 1 | 2 |\n\n> [!WATCHOUT] W\n> - ✗ a → ✓ b\n');
  ok(md.html.includes('id="a"') && md.html.includes('<table') && md.html.includes('callout-watchout'), 'markdown basics');
}

// ---------------- Fortschrittscode ----------------
function codeTests() {
  const topic = { id: 'selftest', codePrefix: 'ST', sets: [] };
  sessionStorage.setItem('ek8:progress:selftest', JSON.stringify([1, 2, 7, 40, 179]));
  const code = encodeProgress(topic);
  const dec = decodeProgress(topic, code.toLowerCase().replace(/-/g, ' '));
  ok(dec.ok && [1, 2, 7, 40, 179].every((x) => dec.ids.has(x)) && dec.ids.size === 5, `Code hin und zurück (${code})`);
  const broken = code.slice(0, -1) + (code.endsWith('0') ? '1' : '0');
  ok(!decodeProgress(topic, broken).ok, 'Tippfehler im Code wird erkannt');
  ok(!decodeProgress({ ...topic, codePrefix: 'XX' }, code).ok, 'Code eines anderen Themas wird abgelehnt');
  sessionStorage.removeItem('ek8:progress:selftest');
}

// ---------------- Alle Aufgaben ----------------
async function loadJson(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

function render(type, item, set, topic) {
  const ctx = { set, topic, item, number: 1, requestCheck() {}, markSolved() {} };
  const inst = type.render(item, ctx);
  sandbox.replaceChildren(inst.element);
  return inst;
}

async function itemTests() {
  const registry = await loadJson('../content/topics.json');
  let items = 0;
  for (const t of registry.topics) {
    const topic = await loadJson(`../content/${t.id}/topic.json`);
    topic.id = t.id;
    for (const sub of topic.subtopics) {
      for (const setId of sub.sets) {
        const set = await loadJson(`../content/${t.id}/exercises/${setId}.json`);
        const type = getType(set.type);
        ok(!!type, `${setId}: Typ "${set.type}" bekannt`);
        if (!type) continue;
        for (const item of set.items) {
          items++;
          const where = `${setId} #${item.id}`;
          try {
            testItem(type, set, item, topic, where);
          } catch (e) {
            ok(false, `${where}: Fehler ${e.message}`);
          }
        }
      }
    }
  }
  return items;
}

function testItem(type, set, item, topic, where) {
  let inst = render(type, item, set, topic);
  switch (set.type) {
    case 'gapfill': {
      inst.showSolution();
      ok(inst.check().correct, `${where}: Musterlösung wird als richtig erkannt`);
      inst.reset();
      sandbox.querySelectorAll('input').forEach((i) => (i.value = 'xyz'));
      ok(!inst.check().correct, `${where}: falsche Antwort wird als falsch erkannt`);
      inst.reset();
      ok(inst.isEmpty(), `${where}: nach Zurücksetzen leer`);
      break;
    }
    case 'multiple-choice': {
      inst.showSolution();
      ok(inst.check().correct, `${where}: richtige Antwort erkannt`);
      inst.reset();
      const wrong = [...sandbox.querySelectorAll('input')].find((i) => i.value !== item.answer);
      wrong.checked = true;
      ok(!inst.check().correct, `${where}: falsche Antwort erkannt`);
      break;
    }
    case 'transform': {
      const variants = [].concat(item.answer).flatMap((p) => expandPattern(p)).slice(0, 60);
      for (const v of variants) {
        inst._fill(v);
        ok(inst.check().correct, `${where}: Variante richtig: "${v}"`);
      }
      if (item.start) {
        const first = expandPattern([].concat(item.answer)[0])[0];
        ok(first.toLowerCase().startsWith(item.start.toLowerCase()), `${where}: "start" passt zur Lösung`);
        inst._fill(`${item.start} xyz.`);
      } else {
        inst._fill('xyz.');
      }
      ok(!inst.check().correct, `${where}: falsche Antwort erkannt`);
      inst.reset();
      ok(inst.isEmpty(), `${where}: nach Zurücksetzen leer`);
      break;
    }
    case 'match': {
      inst.showSolution();
      ok(inst.check().correct, `${where}: Lösung richtig`);
      inst.reset();
      inst._placeWrong();
      ok(!inst.check().correct, `${where}: falsche Zuordnung erkannt`);
      break;
    }
    case 'word-order': {
      inst.showSolution();
      ok(inst.check().correct, `${where}: Lösung richtig`);
      inst.reset();
      // alle Wörter in der (gemischten) Reihenfolge antippen – inklusive Störwort -> falsch
      let btn;
      let guard = 0;
      while ((btn = sandbox.querySelector('.wo-pool button')) && guard++ < 50) btn.click();
      ok(!inst.check().correct, `${where}: falsche Reihenfolge erkannt`);
      break;
    }
    case 'error-correction': {
      inst._solve();
      ok(inst.check().correct, `${where}: Lösung richtig`);
      inst.reset();
      if ((item.errors || []).length) {
        sandbox.querySelector('.ec-nomistake').click();
      } else {
        sandbox.querySelector('.ec-token').click();
      }
      ok(!inst.check().correct, `${where}: falsche Antwort erkannt`);
      break;
    }
    case 'open-text': {
      inst.showSolution();
      ok(sandbox.querySelectorAll('.checklist input').length === item.checklist.length, `${where}: Checkliste wird angezeigt`);
      ok(!!sandbox.querySelector('.model-text'), `${where}: Musterlösung vorhanden`);
      inst.reset();
      break;
    }
    default:
      ok(false, `${where}: kein Test für Typ ${set.type}`);
  }
  inst = null;
}

(async () => {
  try {
    unitTests();
    codeTests();
    const n = await itemTests();
    sandbox.replaceChildren();
    if (failures.length) {
      summary.className = 'fail';
      summary.textContent = `✗ ${failures.length} Fehler, ${passed} Prüfungen bestanden (${n} Aufgaben).`;
    } else {
      summary.className = 'pass';
      summary.textContent = `✓ Alle ${passed} Prüfungen bestanden (${n} Aufgaben).`;
    }
  } catch (e) {
    summary.className = 'fail';
    summary.textContent = `✗ Test abgebrochen: ${e.message}`;
  }
})();
