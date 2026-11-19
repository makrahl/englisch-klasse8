#!/usr/bin/env python3
"""
Prüfskript für die Inhalte der Englisch-App.

Aufruf (im Projektordner):
    python3 tools/validate_content.py

Prüft u. a.:
  - kaputtes JSON (mit Zeilennummer)
  - fehlende Pflichtfelder und fehlende Lösungen
  - unbekannte Aufgabentypen
  - doppelte oder fehlende Aufgaben-Nummern ("id")
  - Klammerfehler in Lösungsmustern ( ) [ ]
  - Verweise auf Regel-Abschnitte ("rulesRef"), die es nicht gibt
  - Übungsdateien, die in topic.json fehlen (oder umgekehrt)

Läuft nur mit Python-Bordmitteln (keine Installation nötig).
Rückgabewert: 0 = alles in Ordnung, 1 = Fehler gefunden.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
TYPES_DIR = ROOT / "js" / "exercise-types"

errors = []
warnings = []


def err(where, msg):
    errors.append(f"FEHLER   {where}: {msg}")


def warn(where, msg):
    warnings.append(f"HINWEIS  {where}: {msg}")


def rel(path):
    try:
        return str(path.relative_to(ROOT)).replace("\\", "/")
    except ValueError:
        return str(path)


def load_json(path):
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        err(rel(path), "Datei nicht gefunden")
        return None
    except UnicodeDecodeError:
        err(rel(path), "Datei ist nicht als UTF-8 gespeichert")
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        line = text.splitlines()[e.lineno - 1] if 0 < e.lineno <= len(text.splitlines()) else ""
        err(rel(path), f"kaputtes JSON in Zeile {e.lineno}, Spalte {e.colno}: {e.msg}\n           -> {line.strip()}")
        return None


def known_types():
    """Typ-Namen = Dateinamen in js/exercise-types/ (außer index.js), die in index.js eingetragen sind."""
    index_file = TYPES_DIR / "index.js"
    index_text = index_file.read_text(encoding="utf-8") if index_file.exists() else ""
    types = set()
    for f in sorted(TYPES_DIR.glob("*.js")):
        if f.name == "index.js":
            continue
        name = f.stem
        text = f.read_text(encoding="utf-8")
        m = re.search(r"\bid:\s*['\"]([\w-]+)['\"]", text)
        if not m or m.group(1) != name:
            err(rel(f), f"Das Modul muss id: '{name}' enthalten (gleich wie der Dateiname).")
        if f"./{f.name}" not in index_text:
            err(rel(index_file), f"Der Aufgabentyp '{name}' ist nicht in index.js eingetragen.")
        types.add(name)
    return types


def pattern_error(p):
    stack = []
    i = 0
    while i < len(p):
        ch = p[i]
        if ch == "\\":
            i += 2
            continue
        if ch in "([":
            stack.append(ch)
        elif ch in ")]":
            if not stack:
                return "schließende Klammer ohne öffnende"
            o = stack.pop()
            if (ch == ")" and o != "(") or (ch == "]" and o != "["):
                return "Klammern passen nicht zusammen"
        i += 1
    if stack:
        return "Klammer nicht geschlossen"
    return None


def check_patterns(where, value, field="answer"):
    if isinstance(value, str):
        value = [value]
    if not isinstance(value, list) or not value or not all(isinstance(v, str) and v.strip() for v in value):
        err(where, f'"{field}" fehlt oder ist leer (Text oder Liste von Texten)')
        return
    for v in value:
        pe = pattern_error(v)
        if pe:
            err(where, f'Lösungsmuster fehlerhaft ({pe}): "{v}"')


def require_str(where, item, field):
    v = item.get(field)
    if not isinstance(v, str) or not v.strip():
        err(where, f'Feld "{field}" fehlt oder ist leer')
        return False
    return True


GAP_RE = re.compile(r"\{\{(.+?)\}\}")


def check_item(where, set_type, item, set_data):
    if set_type == "gapfill":
        if require_str(where, item, "text"):
            gaps = GAP_RE.findall(item["text"])
            if not gaps:
                err(where, 'im "text" ist keine Lücke {{ … }}')
            for g in gaps:
                if not g.strip():
                    err(where, "leere Lücke {{}}")
                pe = pattern_error(g)
                if pe:
                    err(where, f'Lücke fehlerhaft ({pe}): "{{{{{g}}}}}"')
            if item["text"].count("{{") != item["text"].count("}}"):
                err(where, "Anzahl von {{ und }} passt nicht zusammen")
    elif set_type == "multiple-choice":
        opts = item.get("options")
        if not isinstance(opts, list) or len(opts) < 2:
            err(where, '"options" braucht mindestens 2 Antworten')
        elif len(set(opts)) != len(opts):
            err(where, '"options" enthält eine Antwort doppelt')
        if not isinstance(item.get("answer"), str):
            err(where, '"answer" fehlt (muss genau einer der "options" entsprechen)')
        elif isinstance(opts, list) and item["answer"] not in opts:
            err(where, f'"answer" ("{item["answer"]}") steht nicht in "options"')
    elif set_type == "transform":
        require_str(where, item, "direct")
        check_patterns(where, item.get("answer"))
    elif set_type == "word-order":
        check_patterns(where, item.get("answer"))
        d = item.get("distractors", [])
        if not isinstance(d, list):
            err(where, '"distractors" muss eine Liste sein')
    elif set_type == "match":
        pairs = item.get("pairs")
        if not isinstance(pairs, list) or len(pairs) < 2:
            err(where, '"pairs" braucht mindestens 2 Paare')
        else:
            for k, p in enumerate(pairs, 1):
                if not (isinstance(p, list) and len(p) == 2 and all(isinstance(x, str) and x.strip() for x in p)):
                    err(where, f"Paar {k} muss genau zwei Texte enthalten: [\"links\", \"rechts\"]")
            lefts = [p[0] for p in pairs if isinstance(p, list) and p]
            if len(set(lefts)) != len(lefts):
                err(where, "eine linke Seite kommt doppelt vor")
    elif set_type == "error-correction":
        if require_str(where, item, "sentence"):
            errs = item.get("errors")
            if not isinstance(errs, list):
                err(where, '"errors" fehlt (Liste der falschen Wörter, [] wenn der Satz richtig ist)')
            else:
                words = [re.sub(r"^[^\w']+|[^\w']+$", "", w.lower().replace("’", "'")) for w in item["sentence"].split()]
                for e in errs:
                    if re.sub(r"^[^\w']+|[^\w']+$", "", e.lower().replace("’", "'")) not in words:
                        err(where, f'Fehlerwort "{e}" kommt im Satz nicht vor')
                if errs:
                    check_patterns(where, item.get("answer"))
                elif item.get("answer"):
                    warn(where, 'Satz ohne Fehler ("errors": []) – "answer" wird nicht gebraucht')
    elif set_type == "open-text":
        require_str(where, item, "task")
        require_str(where, item, "model")
        cl = item.get("checklist")
        if not isinstance(cl, list) or not cl:
            err(where, '"checklist" fehlt (Liste von Prüfpunkten)')
        src = item.get("source")
        if src is not None and not isinstance(src, list):
            err(where, '"source" muss eine Liste von Zeilen sein')


def anchors_in_markdown(text):
    anchors = set(re.findall(r"\{#([\w-]+)\}", text))
    return anchors


def check_topic(topic_entry, types, prefixes):
    tid = topic_entry.get("id")
    if not isinstance(tid, str) or not re.fullmatch(r"[a-z0-9-]+", tid or ""):
        err("content/topics.json", f'Themen-"id" ungültig: {tid!r} (nur Kleinbuchstaben, Ziffern, Bindestrich)')
        return
    if not topic_entry.get("title"):
        err("content/topics.json", f'Thema "{tid}" hat keinen "title"')
    folder = CONTENT / tid
    if not folder.is_dir():
        err("content/topics.json", f'Ordner content/{tid}/ fehlt')
        return
    topic_path = folder / "topic.json"
    topic = load_json(topic_path)
    if topic is None:
        return
    where_t = rel(topic_path)
    if topic.get("id") != tid:
        err(where_t, f'"id" muss "{tid}" sein (wie der Ordnername)')
    prefix = topic.get("codePrefix")
    if not isinstance(prefix, str) or not re.fullmatch(r"[A-Z0-9]{2,4}", prefix or ""):
        err(where_t, '"codePrefix" fehlt oder ist ungültig (2–4 Großbuchstaben/Ziffern, z. B. "RS")')
    elif prefix in prefixes:
        err(where_t, f'"codePrefix" "{prefix}" wird schon von Thema "{prefixes[prefix]}" benutzt')
    else:
        prefixes[prefix] = tid

    rules_file = folder / topic.get("rules", "rules.md")
    anchors = set()
    if not rules_file.exists():
        err(where_t, f"Regel-Datei {rel(rules_file)} fehlt")
    else:
        anchors = anchors_in_markdown(rules_file.read_text(encoding="utf-8"))

    listed = []
    subtopics = topic.get("subtopics")
    if not isinstance(subtopics, list) or not subtopics:
        err(where_t, '"subtopics" fehlt oder ist leer')
        subtopics = []
    sub_ids = set()
    for sub in subtopics:
        sid = sub.get("id")
        if not sid:
            err(where_t, 'ein Unterthema hat keine "id"')
        elif sid in sub_ids:
            err(where_t, f'Unterthema "{sid}" kommt doppelt vor')
        sub_ids.add(sid)
        if not sub.get("title"):
            err(where_t, f'Unterthema "{sid}" hat keinen "title"')
        for set_id in sub.get("sets", []):
            if set_id in listed:
                err(where_t, f'Übungsset "{set_id}" ist doppelt eingetragen')
            listed.append(set_id)

    ex_dir = folder / "exercises"
    on_disk = {p.stem for p in ex_dir.glob("*.json")} if ex_dir.is_dir() else set()
    for orphan in sorted(on_disk - set(listed)):
        warn(rel(ex_dir / (orphan + ".json")), "Datei ist nicht in topic.json eingetragen und wird deshalb nicht angezeigt")

    ids = {}
    item_count = 0
    for set_id in listed:
        path = ex_dir / f"{set_id}.json"
        data = load_json(path)
        if data is None:
            continue
        where_s = rel(path)
        if data.get("id") != set_id:
            err(where_s, f'"id" muss "{set_id}" sein (wie der Dateiname)')
        if not data.get("title"):
            err(where_s, '"title" fehlt')
        set_type = data.get("type")
        if set_type not in types:
            err(where_s, f'unbekannter Aufgabentyp "{set_type}" (bekannt: {", ".join(sorted(types))})')
            continue
        if data.get("level") not in (1, 2, 3):
            err(where_s, '"level" muss 1, 2 oder 3 sein')
        ref = data.get("rulesRef")
        if ref and anchors and ref not in anchors:
            err(where_s, f'"rulesRef": "{ref}" – diesen Abschnitt {{#{ref}}} gibt es in der Regel-Datei nicht')
        if "context" in data and not isinstance(data["context"], list):
            err(where_s, '"context" muss eine Liste von Zeilen sein')
        items = data.get("items")
        if not isinstance(items, list) or not items:
            err(where_s, '"items" fehlt oder ist leer')
            continue
        for k, item in enumerate(items, 1):
            iid = item.get("id") if isinstance(item, dict) else None
            where_i = f"{where_s} (Aufgabe {k}, id {iid})"
            if not isinstance(item, dict):
                err(where_i, "Aufgabe muss ein Objekt { … } sein")
                continue
            if not isinstance(iid, int) or isinstance(iid, bool) or iid < 1:
                err(where_i, '"id" fehlt oder ist keine ganze Zahl ≥ 1')
            elif iid in ids:
                err(where_i, f'"id" {iid} gibt es schon in {ids[iid]}')
            else:
                ids[iid] = where_s
            if item.get("hint") is not None and not isinstance(item.get("hint"), str):
                err(where_i, '"hint" muss ein Text sein')
            check_item(where_i, set_type, item, data)
            if not item.get("hidden"):
                item_count += 1

    next_id = max(ids) + 1 if ids else 1
    if ids and max(ids) > 4000:
        warn(where_t, "sehr hohe Aufgaben-Nummern machen den Fortschrittscode lang")
    print(f"  Thema '{tid}': {len(listed)} Übungssets, {item_count} Aufgaben. Nächste freie Aufgaben-Nummer: {next_id}")


def main():
    print("Prüfe Inhalte …")
    types = known_types()
    registry = load_json(CONTENT / "topics.json")
    if registry is not None:
        topics = registry.get("topics")
        if not isinstance(topics, list) or not topics:
            err("content/topics.json", '"topics" fehlt oder ist leer')
        else:
            seen = set()
            prefixes = {}
            for t in topics:
                if t.get("id") in seen:
                    err("content/topics.json", f'Thema "{t.get("id")}" ist doppelt eingetragen')
                seen.add(t.get("id"))
                check_topic(t, types, prefixes)

    for w in warnings:
        print(w)
    for e in errors:
        print(e)
    if errors:
        print(f"\n✗ {len(errors)} Fehler gefunden. Bitte korrigieren.")
        return 1
    print(f"\n✓ Alles in Ordnung ({len(warnings)} Hinweise).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
