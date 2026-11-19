// Lädt die Inhalte aus dem Ordner content/.
// Fehler (z. B. kaputtes JSON) werden mit Dateinamen gemeldet.

export class ContentError extends Error {
  constructor(file, message) {
    super(`${file}: ${message}`);
    this.file = file;
    this.detail = message;
  }
}

const cache = new Map();

async function fetchText(path) {
  let res;
  try {
    res = await fetch(path, { cache: 'no-cache' });
  } catch (e) {
    throw new ContentError(path, `Datei konnte nicht geladen werden (${e.message}).`);
  }
  if (!res.ok) throw new ContentError(path, `Datei nicht gefunden (HTTP ${res.status}).`);
  return res.text();
}

export async function loadJson(path) {
  if (cache.has(path)) return cache.get(path);
  const promise = (async () => {
    const text = await fetchText(path);
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new ContentError(path, `Fehler im JSON-Format – ${e.message}`);
    }
  })();
  cache.set(path, promise);
  promise.catch(() => cache.delete(path));
  return promise;
}

export async function loadText(path) {
  if (cache.has(path)) return cache.get(path);
  const promise = fetchText(path);
  cache.set(path, promise);
  promise.catch(() => cache.delete(path));
  return promise;
}

export async function loadTopics() {
  const data = await loadJson('content/topics.json');
  return (data.topics || []).filter((t) => !t.hidden);
}

/**
 * Lädt ein Thema komplett: topic.json + alle Übungssets.
 * Ergebnis: { ...topic, folder, sets: [set], setsById: Map, subtopics: [{..., sets:[set]}] }
 */
export async function loadTopic(topicId) {
  const key = `topic:${topicId}`;
  if (cache.has(key)) return cache.get(key);
  const promise = (async () => {
    const folder = `content/${topicId}`;
    const topic = await loadJson(`${folder}/topic.json`);
    const subtopics = [];
    const sets = [];
    const setsById = new Map();
    for (const sub of topic.subtopics || []) {
      const loaded = await Promise.all(
        (sub.sets || []).map(async (setId) => {
          const set = await loadJson(`${folder}/exercises/${setId}.json`);
          set.id = set.id || setId;
          set.subtopic = sub.id;
          set.items = (set.items || []).filter((it) => !it.hidden);
          return set;
        }),
      );
      for (const s of loaded) {
        sets.push(s);
        setsById.set(s.id, s);
      }
      subtopics.push({ ...sub, sets: loaded });
    }
    return { ...topic, id: topic.id || topicId, folder, subtopics, sets, setsById };
  })();
  cache.set(key, promise);
  promise.catch(() => cache.delete(key));
  return promise;
}

export async function loadRules(topic) {
  return loadText(`${topic.folder}/${topic.rules || 'rules.md'}`);
}
